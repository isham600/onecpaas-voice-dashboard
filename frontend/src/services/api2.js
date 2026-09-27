export const broadcastSpecific = async ({ request_id, username, page, per_page, search, status }) => {
      try {
        const params = {
          request_id,
          username,
          page: page || 1, // Default page
          per_page: per_page || 10, // Default rows per page
        };
    
        // Add optional filters
        if (search) params.search = search;
        if (status) params.status = status;
    
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/broadcastSpecific`, {
          params, // Pass query parameters here
        });
    
        return response;
      } catch (error) {
        throw error; // Rethrow the error for higher-level handling
      }
    };