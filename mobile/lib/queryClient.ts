import { QueryClient } from '@tanstack/react-query';


const uri = `https://v.bkk.lol`;


// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  // Add your local server URL here
  const apiUrl = `${uri}${url}`;
  
  const res = await fetch(apiUrl, {
    method,
    headers: data ? { 
      "Content-Type": "application/json",
      // Add these headers for development
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  
  return res;
}

export { queryClient };