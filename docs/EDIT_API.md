# Image Edit API Documentation

## Overview

The Image Edit API allows you to modify existing images using OpenAI's GPT-Image-1 model. This API accepts one or more source images and a prompt that describes the desired modification.

## Endpoint

```
POST /api/edit-image
```

## Request Parameters

The request body should be a JSON object with the following properties:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `images` | Array<string> | Yes | Array of base64-encoded image strings (may include data URL prefix). Minimum 1, maximum 16 images. |
| `prompt` | string | Yes | A text description of the desired edit(s). Maximum length is 32,000 characters. |
| `size` | string | No | Size of the output image. One of `"auto"`, `"1024x1024"`, `"1536x1024"` (landscape), or `"1024x1536"` (portrait). Default is `"1024x1024"`. |
| `quality` | string | No | Quality of the generated image. One of `"auto"`, `"high"`, `"medium"`, or `"low"`. Default is `"auto"`. |
| `n` | number | No | Number of images to generate. Must be between 1 and 10. Default is 1. |
| `mask` | string or null | No | Base64-encoded PNG image with transparent areas indicating where the edit should be applied. If not provided, the entire image will be editable. |

## Response

The response will be a JSON object with the following structure:

```json
{
  "images": [
    {
      "id": "img_1234567890_0",
      "url": "data:image/png;base64,...",
      "prompt": "Add a red hat",
      "size": "1024x1024",
      "model": "gpt-image-1",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## Example Usage

### cURL

```bash
curl -X POST "https://your-domain.com/api/edit-image" \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["data:image/png;base64,iVBORw0KG..."],
    "prompt": "Add a red hat to the person",
    "size": "1024x1024",
    "quality": "high",
    "n": 1,
    "mask": null
  }'
```

### JavaScript

```javascript
async function editImage(images, prompt) {
  const response = await fetch('/api/edit-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: images,
      prompt: prompt,
      size: "1024x1024",
      quality: "high",
      n: 1,
      mask: null
    }),
  });
  
  return await response.json();
}
```

## Limitations

- Maximum of 16 source images
- Each image must be less than 25MB in size
- Supported formats: PNG, JPEG, WebP
- Maximum prompt length: 32,000 characters
- If a mask is provided, transparent areas in the mask indicate where the edit should be applied

## Error Handling

The API will return a 400 status code for invalid inputs, with a JSON response that includes an error message and details about the validation failure.

Example error response:

```json
{
  "message": "Invalid request data",
  "errors": [
    {
      "code": "too_big",
      "path": ["images"],
      "message": "Maximum of 16 images allowed"
    }
  ]
}
```

For server errors, a 500 status code will be returned with an error message.