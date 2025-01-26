import json
import os

def convert_accounts_to_json():
    wallets = []
    
    try:
        # Check if file exists
        if not os.path.exists('accounts.txt'):
            print("accounts.txt not found in current directory:", os.getcwd())
            return

        # Read and print file content for debugging
        with open('accounts.txt', 'r', encoding='utf-8') as f:
            content = f.read()
            print("Raw content length:", len(content))
            print("First 100 characters:", content[:100])
            
        # Split by separator and print count
        accounts = content.split('===================================================================')
        print(f"Found {len(accounts)} raw account entries")
        
        for i, account in enumerate(accounts):
            account = account.strip()
            if not account:
                print(f"Skipping empty account entry {i}")
                continue
                
            print(f"\nProcessing account {i}:")
            print(account)
                
            lines = account.split('\n')
            address = None
            private_key = None
            
            for line in lines:
                line = line.strip()
                if 'Wallet Address' in line:
                    address = line.split(':')[1].strip()
                    print(f"Found address: {address}")
                elif 'Private Key' in line:
                    private_key = line.split(':')[1].strip().replace('0x', '')
                    print(f"Found private key: {private_key[:8]}...")
            
            if address and private_key:
                wallet = {
                    "address": address,
                    "privateKey": private_key
                }
                wallets.append(wallet)
                print(f"Added wallet {len(wallets)}")
        
        if not wallets:
            print("No valid wallets found!")
            return
            
        # Write to wallets.json with pretty formatting
        with open('wallets.json', 'w') as f:
            json.dump(wallets, f, indent=4)
            
        print(f"\nSuccessfully converted {len(wallets)} wallets to wallets.json")
        
    except Exception as e:
        print(f"Error during conversion: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Starting conversion...")
    convert_accounts_to_json()
