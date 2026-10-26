from PIL import Image
from pathlib import Path
import json, numpy as np, shutil
ROOT=Path(__file__).resolve().parents[1]
manifest={Path(r['file']).stem:r for r in json.loads((ROOT/'specs/asset-manifest.json').read_text())}
out=ROOT/'assets'
records=json.loads((ROOT/'source/prompts.json').read_text())
for rec in records:
 name=rec['name']; source=Image.open(ROOT/rec['path']).convert('RGBA')
 size=(manifest[name]['width'],manifest[name]['height'])
 # Keep registered full canvases for backgrounds and layered props; tightly fit isolated cutouts.
 if name in ['house','trampoline','bush-berries','bush-hydrangea','egg-chair','stump']:
  box=source.getchannel('A').point(lambda a:255 if a>=160 else 0).getbbox()
  source=source.crop(box)
 im=source.resize((size[0]//2,size[1]//2),Image.Resampling.LANCZOS)
 a=np.asarray(im).copy();mask=a[:,:,3]>=160
 a[:,:,3]=np.where(mask,255,0);a[~mask,:3]=0
 budget=128 if name in ['house','treehouse'] else 96 if name.startswith('bg-') else 32 if name.startswith('tile-') else 64
 rgb=Image.fromarray(a[:,:,:3]).quantize(colors=budget,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
 im=rgb.convert('RGBA');im.putalpha(Image.fromarray(a[:,:,3]))
 dest=out/'public/assets/garden'/f'{name}.png';im.resize(size,Image.Resampling.NEAREST).save(dest)
 print(name,size,budget)
