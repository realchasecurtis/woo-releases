from PIL import Image,ImageDraw
from pathlib import Path
import re
p=Path(__file__).resolve().parent.parent/'src/assets';s=(p/'woo-icon.svg').read_text();assert 'M0 0H256V256H0Z' not in s
assert 'M0 0H46V56H64V0H110V56H128V0H173V98H37C15 98 0 83 0 61Z' in s
# Rasterize the exact source polygon and its one cubic Bezier at 4x output resolution.
scale=16;im=Image.new('RGBA',(256*scale,256*scale),(0,0,0,0));pts=[(0,0),(46,0),(46,56),(64,56),(64,0),(110,0),(110,56),(128,56),(128,0),(173,0),(173,98),(37,98)]
for i in range(1,257):
 t=i/256;u=1-t;pts.append((u**3*37+3*u*u*t*15,u**3*98+3*u*u*t*98+3*u*t*t*83+t**3*61))
pts.append((0,0));ImageDraw.Draw(im).polygon([((30+1.13*x)*scale,(72+1.13*y)*scale) for x,y in pts],fill=(18,204,253,255));im.resize((1024,1024),Image.Resampling.LANCZOS).save(p/'woo-icon.png')

