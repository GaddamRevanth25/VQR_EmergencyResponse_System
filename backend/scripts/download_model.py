import os
import urllib.request

def download_file(url, dest_path):
    print(f"Downloading {url} to {dest_path}...")
    try:
        # User-Agent to avoid blockage
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        print("Success.")
    except Exception as e:
        print(f"Failed: {e}")
        raise e

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir = os.path.join(base_dir, "model")
    os.makedirs(model_dir, exist_ok=True)
    
    files = {
        "binary_128_0.50_ver3.pb": "https://raw.githubusercontent.com/longphungtuan94/ALPR_System/master/model/binary_128_0.50_ver3.pb",
        "binary_128_0.50_labels_ver2.txt": "https://raw.githubusercontent.com/longphungtuan94/ALPR_System/master/model/binary_128_0.50_labels_ver2.txt"
    }
    
    for filename, url in files.items():
        dest = os.path.join(model_dir, filename)
        if not os.path.exists(dest):
            download_file(url, dest)
        else:
            print(f"{filename} already exists at {dest}")

if __name__ == "__main__":
    main()
