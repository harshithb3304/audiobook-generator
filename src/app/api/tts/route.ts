// src/app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

// Validate that the Deepgram API key is set
if (!process.env.DEEPGRAM_API_KEY) {
  console.error('Missing DEEPGRAM_API_KEY environment variable');
}

// Create a Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate required parameters
    const { text, model, encoding, container } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Missing required parameter: text' },
        { status: 400 }
      );
    }
    
    // Check text length limitations
    if (text.length > 2000) {
      return NextResponse.json(
        { error: 'Text exceeds the maximum length of 2000 characters' },
        { status: 400 }
      );
    }
    
    // Optional parameters with defaults
    const speechRate = body.speechRate || 1.0;
    
    // Make the TTS request to Deepgram
    const response = await deepgram.speak.request(
      { text },
      {
        model: model || 'aura-asteria-en',
        encoding: encoding || 'linear16',
        container: container || 'wav',
        sample_rate: 24000, // High quality sample rate
        speed: speechRate,
      }
    );
    
    // Get the audio stream from the response
    const stream = await response.getStream();
    
    if (!stream) {
      return NextResponse.json(
        { error: 'Failed to generate audio stream' },
        { status: 500 }
      );
    }
    
    // Read the stream into a buffer
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks into a single Uint8Array
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const audioData = new Uint8Array(totalLength);
    
    let position = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, position);
      position += chunk.length;
    }
    
    // Create the response with appropriate headers
    const contentType = container === 'wav' ? 'audio/wav' : 
                        container === 'ogg' ? 'audio/ogg' : 
                        'application/octet-stream';
    
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': totalLength.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error in TTS API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process text-to-speech request',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}