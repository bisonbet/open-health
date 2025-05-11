import {NextRequest, NextResponse} from "next/server";
import prisma, {Prisma} from "@/lib/prisma";
import {auth} from "@/auth";

export interface ChatMessage extends Prisma.ChatMessageGetPayload<{
    select: {
        id: true,
        content: true,
        createdAt: true,
        role: true
    }
}> {
    id: string,
}

export interface ChatMessageListResponse {
    chatMessages: ChatMessage[]
}

export interface ChatMessageCreateRequest {
    content: string,
    role: 'USER' | 'ASSISTANT',
    settings?: {
        company: string,
        model: string,
        apiEndpoint: string,
        apiKey: string
    }
}

export async function GET(
    req: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    const {id} = await params
    const chatMessages = await prisma.chatMessage.findMany({
        where: {chatRoomId: id},
        orderBy: {createdAt: 'asc'}
    });

    return NextResponse.json<ChatMessageListResponse>({chatMessages})
}

export async function POST(
    req: NextRequest,
    {params}: {
        params: Promise<{ id: string }>,
    }
) {
    const session = await auth()
    const user = session?.user
    if (!session || !user) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

    const {id} = await params
    const body: ChatMessageCreateRequest = await req.json()

    const {
        chatRoom,
        assistantMode,
        chatMessages,
        healthDataList
    } = await prisma.$transaction(async (prisma) => {
        await prisma.chatMessage.create({data: {content: body.content, role: body.role, chatRoomId: id}});
        const {assistantMode} = await prisma.chatRoom.update({
            where: {id},
            data: {lastActivityAt: new Date()},
            select: {assistantMode: {select: {systemPrompt: true}}}
        })
        const chatMessages = await prisma.chatMessage.findMany({
            where: {chatRoomId: id},
            orderBy: {createdAt: 'asc'}
        })
        const healthDataList = await prisma.healthData.findMany({where: {authorId: user.id}})
        const chatRoom = await prisma.chatRoom.findUniqueOrThrow({
            where: {id},
            include: {
                assistantMode: true,
                llmProvider: true
            }
        });
        return {
            chatRoom,
            chatMessages,
            assistantMode,
            healthDataList
        }
    })

    const messages = [
        {"role": "system" as const, "content": assistantMode.systemPrompt},
        {
            "role": "user" as const,
            "content": `Health data sources: ${healthDataList.map((healthData) => `${healthData.type}: ${JSON.stringify(healthData.data)}`).join('\n')}`
        },
        ...chatMessages.map((message) => ({
            role: message.role.toLowerCase() as 'user' | 'assistant',
            content: message.content
        }))
    ]

    const responseStream = new ReadableStream({
        async start(controller) {
            let messageContent = '';

            try {
                const ollamaApiUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://ollama:11434";
                console.log(`Attempting to connect to Ollama at: ${ollamaApiUrl}`);
                const response = await fetch(`${ollamaApiUrl}/api/chat`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        model: chatRoom.llmProviderModelId,
                        messages: messages,
                        stream: true,
                    }),
                });

                const reader = response.body?.getReader();
                if (!reader) throw new Error('No reader available');

                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;

                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        if (line.includes('[DONE]')) continue;
                        try {
                            const json = JSON.parse(line);
                            const content = json.message?.content;
                            if (content) {
                                messageContent += content;
                                controller.enqueue(`${JSON.stringify({content: messageContent})}\n`);
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', e);
                        }
                    }
                }

                // Save to prisma after the stream is done
                await prisma.$transaction(async (prisma) => {
                    await prisma.chatMessage.create({
                        data: {
                            content: messageContent,
                            role: 'ASSISTANT',
                            chatRoomId: id
                        }
                    });
                    await prisma.chatRoom.update({
                        where: {id}, data: {lastActivityAt: new Date(), name: messageContent}
                    })
                });
            } catch (error) {
                console.error('Error in chat stream:', error);
                controller.enqueue(`${JSON.stringify({error: 'Failed to get response from LLM'})}\n`);
            }

            controller.close();
        }
    });

    return new NextResponse(responseStream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
