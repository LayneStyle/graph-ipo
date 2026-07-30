using System;

namespace Game.Net {
    public class NetworkManager {
        public void Initialize() {
            Console.WriteLine("Initializing Network Manager...");
            // Calls AuthService
            AuthService.AuthenticateUser();
        }

        // Unmapped helper method not in design
        public void PingServer() {
            Console.WriteLine("Pinging server...");
        }
    }
}
