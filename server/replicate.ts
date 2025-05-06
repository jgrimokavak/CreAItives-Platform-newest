import fetch from 'node-fetch';
import { log } from './logger';

export interface ReplicatePrediction {
  id: string;
  version: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: any;
  output: any;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  urls: {
    get: string;
    cancel: string;
  };
  metrics: any;
}

export async function createPrediction(version: string, input: any): Promise<ReplicatePrediction> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set in environment variables');
  }

  log({
    ts: new Date().toISOString(),
    direction: "request",
    payload: {
      type: "replicate_prediction",
      version,
      input: { ...input, prompt: input.prompt ? `${input.prompt.substring(0, 50)}...` : undefined }
    }
  });

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version,
      input
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    log({
      ts: new Date().toISOString(),
      direction: "error",
      payload: {
        type: "replicate_prediction",
        status: response.status,
        error: errorText
      }
    });
    throw new Error(`Replicate API error (${response.status}): ${errorText}`);
  }

  const prediction = await response.json() as ReplicatePrediction;
  
  log({
    ts: new Date().toISOString(),
    direction: "response",
    payload: {
      type: "replicate_prediction",
      id: prediction.id,
      status: prediction.status
    }
  });

  return prediction;
}

export async function getPrediction(id: string): Promise<ReplicatePrediction> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set in environment variables');
  }

  log({
    ts: new Date().toISOString(),
    direction: "request",
    payload: {
      type: "replicate_prediction_status",
      id
    }
  });

  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    log({
      ts: new Date().toISOString(),
      direction: "error",
      payload: {
        type: "replicate_prediction_status",
        id,
        status: response.status,
        error: errorText
      }
    });
    throw new Error(`Replicate API error (${response.status}): ${errorText}`);
  }

  const prediction = await response.json() as ReplicatePrediction;
  
  log({
    ts: new Date().toISOString(),
    direction: "response",
    payload: {
      type: "replicate_prediction_status",
      id: prediction.id,
      status: prediction.status,
      hasOutput: !!prediction.output
    }
  });

  return prediction;
}

// Poll for prediction results until complete or timeout
export async function waitForPrediction(id: string, timeoutMs = 600000): Promise<ReplicatePrediction> {
  const startTime = Date.now();
  let prediction: ReplicatePrediction;
  
  // Start with short polling intervals that get longer
  let pollInterval = 1000;
  const maxPollInterval = 5000;
  
  try {
    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Prediction timed out after ${timeoutMs / 1000} seconds`);
      }
      
      try {
        prediction = await getPrediction(id);
      } catch (error) {
        console.error(`Error fetching prediction status for ID ${id}:`, error);
        throw new Error(`Failed to get prediction status: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Log progress with more details about the prediction
      console.log(`Prediction ${id} status: ${prediction.status}`);
      
      if (prediction.status === 'failed' && prediction.error) {
        console.error(`Prediction ${id} failed with error:`, prediction.error);
        throw new Error(`Prediction failed: ${prediction.error}`);
      }
      
      if (prediction.status === 'canceled') {
        console.error(`Prediction ${id} was canceled`);
        throw new Error('Prediction was canceled');
      }
      
      if (prediction.status === 'succeeded') {
        if (!prediction.output) {
          console.error(`Prediction ${id} succeeded but has no output:`, prediction);
          throw new Error('Prediction succeeded but has no output');
        }
        console.log(`Prediction ${id} succeeded with output:`, 
          typeof prediction.output === 'string' ? 
            prediction.output.substring(0, 100) + '...' : 
            JSON.stringify(prediction.output).substring(0, 100) + '...'
        );
        return prediction;
      }
      
      // Exponential backoff with maximum interval
      pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
      
      console.log(`Waiting for prediction ${id}, status: ${prediction.status} (polling in ${Math.round(pollInterval / 1000)}s)`);
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  } catch (error) {
    // Add more context to the error
    console.error(`Error in waitForPrediction for ID ${id}:`, error);
    throw error;
  }
}