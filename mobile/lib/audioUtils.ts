export async function blobUrlToBase64(blobUrl: string): Promise<string> {
  try {
    // Fetch the blob data
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64Content = base64data.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting blob to base64:', error);
    throw new Error('Failed to convert audio to base64');
  }
} 