from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
Image.open(root/'src/assets/woo-icon.png').save(root/'src/assets/woo.ico',sizes=[(n,n) for n in (16,20,24,32,40,48,64,96,128,256)])
