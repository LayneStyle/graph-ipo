using System;

namespace Game.Player {
    public class PlayerController {
        public void OnFireInput() {
            // ORDER MISMATCH: TakeDamage (Step 4) called BEFORE PlayEmptyClick (Step 1 Security Check)!
            HealthSystem.TakeDamage();
            WeaponManager.GetActiveWeapon();
            PlayEmptyClick();
        }

        private void PlayEmptyClick() {
            Console.WriteLine("Click!");
        }
    }
}
