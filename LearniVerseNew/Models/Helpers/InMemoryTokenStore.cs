using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.Helpers
{
    public static class InMemoryTokenStore
    {
        // Simple dictionary to store tokens with session IDs
        private static Dictionary<string, string> tokenStore = new Dictionary<string, string>();

        // Save the token with sessionId
        public static void SaveToken(string token, string sessionId)
        {
            tokenStore[token] = sessionId;
        }

        // Get sessionId based on token
        public static string GetSessionIdForToken(string token)
        {
            tokenStore.TryGetValue(token, out string sessionId);
            return sessionId;
        }

        // Invalidate the token (remove it from the store)
        public static void InvalidateToken(string token)
        {
            tokenStore.Remove(token);
        }
    }
}