from pathlib import Path
import json, shutil, hashlib
from PIL import Image,ImageDraw,ImageFont
import numpy as np
ROOT=Path(__file__).resolve().parents[1];pack=ROOT;project=pack/'before-assets'
records=json.loads((pack/'source/prompts.json').read_text())
frames={'bird-bath':2,'washing-line':4,'gate':2}
(pack/'source').mkdir(parents=True,exist_ok=True);(pack/'specs').mkdir(exist_ok=True)
manifest=[]
for r in records:
 name=r['name'];rel=Path('src/assets/replacements' if name.startswith('obstacle') else 'public/assets/garden')/(name+'.png')
 original=Image.open(project/rel).convert('RGBA')
 backup=pack/'before-assets'/rel;backup.parent.mkdir(parents=True,exist_ok=True)
 if not backup.exists():shutil.copy2(project/rel,backup)
 original=Image.open(backup).convert('RGBA')
 source=Image.open(pack/'source'/(name+'-master.png')).convert('RGBA')
 w,h=original.size;n=frames.get(name,1);target=Image.new('RGBA',(w//2,h//2))
 for i in range(n):
  part=source.crop((round(i*source.width/n),0,round((i+1)*source.width/n),source.height))
  old=original.crop((i*w//n,0,(i+1)*w//n,h))
  if name=='treehouse':
   cell=part.resize((w//2,h//2),Image.Resampling.LANCZOS)
  else:
   sb=part.getchannel('A').point(lambda a:255 if a>=160 else 0).getbbox()
   ob=old.getchannel('A').getbbox()
   # Frame bounds snapped to the fixed logical pixel grid, bottom feet preserved.
   x0,y0,x1,y1=ob;x0//=2;y0//=2;x1=(x1+1)//2;y1=(y1+1)//2
   cell=Image.new('RGBA',(w//n//2,h//2));part=part.crop(sb).resize((x1-x0,y1-y0),Image.Resampling.LANCZOS);cell.paste(part,(x0,y0))
  target.paste(cell,(i*w//n//2,0))
 a=np.array(target);a[:,:,3]=np.where(a[:,:,3]>=120 if name=='goal' else a[:,:,3]>=160,255,0);a[a[:,:,3]==0,:3]=0
 budget=128 if name=='treehouse' else 48
 rgb=Image.fromarray(a[:,:,:3]).quantize(colors=budget,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
 final=rgb.convert('RGBA');final.putalpha(Image.fromarray(a[:,:,3]));final=final.resize((w,h),Image.Resampling.NEAREST)
 dest=pack/'assets'/rel;dest.parent.mkdir(parents=True,exist_ok=True);final.save(dest)
 arr=np.array(final);colors=len(set(map(tuple,arr[:,:,:3][arr[:,:,3]>0].tolist())))
 manifest.append({'file':rel.as_posix(),'width':w,'height':h,'frames':n,'frameWidth':w//n,'frameHeight':h,'colours':colors,'budget':budget,'grid':2,'alpha':[0,255],'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'before_sha256':hashlib.sha256(backup.read_bytes()).hexdigest()})
 if n>1:
  ims=[]
  for i in range(n):
   frame=final.crop((i*w//n,0,(i+1)*w//n,h));bg=Image.new('RGBA',frame.size,'#aec0ad');bg.alpha_composite(frame);ims.append(bg.convert('RGB').resize((frame.width*2,frame.height*2),Image.Resampling.NEAREST))
  ims[0].save(pack/(name+'-animation.gif'),save_all=True,append_images=ims[1:],duration=667 if name=='bird-bath' else 250 if name=='washing-line' else 1000,loop=0)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16);board=Image.new('RGB',(1040,1100),'#22362f');d=ImageDraw.Draw(board)
for i,m in enumerate(manifest):
 x=(i%2)*520;y=(i//2)*275;d.text((x+12,y+8),Path(m['file']).stem,fill='#fff0ce',font=font)
 im=Image.open(pack/'assets'/m['file']).convert('RGBA');n=m['frames'];im=im.crop((0,0,im.width//n,im.height))
 scale=min(480/im.width,236/im.height);im=im.resize((int(im.width*scale),int(im.height*scale)),Image.Resampling.NEAREST)
 board.paste(im,(x+20,y+32),im)
board.save(pack/'asset-preview.png')
(pack/'specs/manifest.json').write_text(json.dumps(manifest,indent=2));(pack/'source/prompts.json').write_text(json.dumps(records,indent=2))
print(json.dumps(manifest,indent=2))
