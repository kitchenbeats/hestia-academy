export const listBlobs = async () => {
    try {
      const response = await fetch('https://blob-CloudCorpRecord.replit.app/list-blobs');
      if (!response.ok) {
        console.error('Failed to fetch:', response.statusText);
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching blobs:', error);
      throw error;
    }
  };
  
  export const searchBlobs = async (query: string) => {
    const blobs = await listBlobs();
    return blobs.filter((blob: { name: string | string[]; }) => blob.name.includes(query));
  };