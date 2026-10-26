"""Art-direction overrides for the project's editable procedural sources.
Writes only the candidate pack. Draw at logical half size; export nearest 2x.
"""
from pathlib import Path
import sys, random, json
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'source/native'))
import make_garden as g
g.PROJECT=str(ROOT/'source/reference-game')
OUT=ROOT/'assets'
def rgba(c): return tuple(bytes.fromhex(c))+(255,)
def canvas(w,h): return Image.new('RGBA',(w,h))
def save(im,name,folder='garden'):
 p=OUT/('src/assets/replacements' if folder=='replacement' else 'public/assets/'+folder)/(name+'.png')
 p.parent.mkdir(parents=True,exist_ok=True)
 im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST).save(p)
 return im
def palette(*a): return [tuple(bytes.fromhex(c)) for c in a]
# Warm limestone and weathered timber; green shadows lean teal, highlights gold.
g.STONE_V2=palette('363e37','525b50','707667','92957c','b4b298','cdc6a6','e4d8b7','f3e6c8')
g.STONE=g.STONE_V2[1:7]
g.GRASS_V2=palette('183c30','28513b','416839','63833b','86a744','acc857','cbd775','e7e9a1')
g.GRASS=g.GRASS_V2[1:7]
g.LEAVES=palette('173b30','23513b','3b693e','557f40','749547','9bb04e','c0cc68','e4dc8b')
g.FOLIAGE=g.LEAVES[1:7]
g.LEAF_OUTLINE=tuple(bytes.fromhex('183b30'))
g.WOOD=palette('3c2c22','614331','92613d','bf8c54','e4bd7c')
g.BARK_V2=palette('332b25','51402f','745637','997247','bc935d','dfbd84')
g.BARK=g.BARK_V2[:5]
g.SOIL=palette('302a24','44362a','5c4530','765737','947248','b39465')
g.TERRACOTTA=palette('663c32','99553e','c07b52','e2a577')
g.GRAVEL=palette('767465','99967e','b9b295','d7ccad','eee2c2')
g.RED=palette('783739','b74d4c','ed7464','ffa58a')
g.BLUE=palette('24504d','387878','59a7a1','a6d7c1')
# Regenerate editable native art with coordinated materials. Animation dimensions stay fixed.
for fun in [g.tile_dirt,g.tile_grass_top,g.tile_gravel_top,g.tile_wood,g.tile_slab,g.tile_grass_cap,
 g.planter,g.stump,g.drain,g.hedge_arch,g.garden_gate,g.basket,g.pulley,g.lever,
 g.flowers,g.tall_grass,g.bird_bath,g.goal,g.football,g.fern]: fun()
g.flower_pot('pot-pink',palette('8b4356','c66575','ed98a2','ffe1cb'))
g.flower_pot('pot-purple',palette('57577e','8279aa','aaa0d0','ded6ee'))
g.bush('bush')
for n,im in g.ASSETS: save(im,n)
# Native wall tile redesigned with larger uneven limestone blocks and moss pockets.
im=Image.new('RGBA',(48,48),rgba('38443b'));d=ImageDraw.Draw(im);r=random.Random(103)
for row,y in enumerate([0,16,32]):
 for x,w in ([(-8,19),(11,22),(33,23)] if row%2==0 else [(-3,25),(22,20),(42,25)]):
  for ox in [-48,0,48]:
   xx=x+ox; h=15; col=r.choice(['92957c','a7a58d','b4b298'])
   pts=[(xx+2,y+1),(xx+w-3,y),(xx+w-1,y+3),(xx+w-2,y+h-2),(xx+3,y+h),(xx,y+h-4),(xx,y+4)]
   d.polygon(pts,fill=rgba(col));d.line(pts[:3],fill=rgba('e4d8b7'),width=1)
   d.line(pts[2:5],fill=rgba('707667'),width=2)
   d.line([(xx+4,y+4),(xx+w//2,y+3)],fill=rgba('cdc6a6'))
   if (x+row)%3==0:
    d.line([(xx+3,y+13),(xx+7,y+12),(xx+9,y+13)],fill=rgba('63833b'),width=2)
    d.point((xx+5,y+11),fill=rgba('acc857'))
save(im,'tile-stone')
# Air: calm blue with a modest upper-left glow, no diagonal wash across gameplay.
im=canvas(480,270);d=ImageDraw.Draw(im)
top=(109,170,221);bottom=(225,233,204)
for y in range(270):
 t=y/269
 c=tuple(round(a+(b-a)*t) for a,b in zip(top,bottom))+(255,)
 d.line((0,y,479,y),fill=c)
save(im,'bg-sky')
for name,w,h in [('cloud-1',80,34),('cloud-2',56,26)]:
 im=canvas(w,h);d=ImageDraw.Draw(im)
 d.ellipse((2,12,w-3,h-3),fill=rgba('fff0d1'))
 d.ellipse((w*.2,5,w*.65,h-5),fill=rgba('fff0d1'))
 d.ellipse((w*.48,2,w*.85,h-6),fill=rgba('fff0d1'))
 mask=im.getchannel('A');shade=canvas(w,h);sd=ImageDraw.Draw(shade)
 sd.polygon([(0,h-10),(w*.2,h-7),(w*.4,h-12),(w*.6,h-7),(w*.8,h-9),(w,h-5),(w,h),(0,h)],fill=rgba('d6d2cd'))
 shade.putalpha(Image.composite(shade.getchannel('A'),Image.new('L',(w,h)),mask));im.alpha_composite(shade)
 save(im,name)
# Replace the harsh original ray overlay with a restrained warm veil.
im=canvas(240,270);d=ImageDraw.Draw(im)
for y in range(270):
 d.line((0,y,239,y),fill=(255,237,198,max(0,round(8*(1-y/270)))))
save(im,'fx-sunrays')
# HUD badges keep all four texture keys, now a coherent forest/gold family.
for name,icon,accent in [('sprint',None,'e6cb78'),('strength',g.icon_strength,'ddaa79'),('sniff',g.icon_sniff,'b5a6c9'),('bark',g.icon_bark,'9acbbb')]:
 im=canvas(30,30);d=ImageDraw.Draw(im)
 d.ellipse((0,0,29,29),fill=rgba('142c29'),outline=rgba('e0c68e'),width=1)
 d.ellipse((2,2,27,27),fill=rgba('29463c'),outline=rgba('64765a'),width=1)
 if name=='sprint': d.polygon([(16,5),(9,16),(14,16),(12,25),(22,12),(16,12),(19,5)],fill=rgba(accent))
 else:
  glyph=canvas(30,30);icon(ImageDraw.Draw(glyph),glyph)
  mask=glyph.getchannel('A');fill=Image.new('RGBA',(30,30),rgba(accent));im.alpha_composite(Image.composite(fill,canvas(30,30),mask))
 save(im,'badge-'+name,'ui')
for full,name in [(True,'heart-full'),(False,'heart-empty')]:
 im=canvas(13,12);d=ImageDraw.Draw(im)
 d.polygon([(1,1),(4,1),(6,3),(8,1),(11,1),(12,3),(12,6),(6,11),(0,6),(0,3)],fill=rgba('693c39'))
 d.polygon([(2,2),(4,2),(6,4),(8,2),(10,2),(11,3),(11,6),(6,10),(1,6),(1,3)],fill=rgba('ed7464' if full else '3c5149'))
 if full:
  d.line([(2,3),(4,3)],fill=rgba('ffe4bd'));d.line([(2,4),(2,5)],fill=rgba('ffa58a'))
  d.line([(10,6),(6,9)],fill=rgba('b74d4c'))
 save(im,name,'ui')
# Reuse the established portrait extraction from the existing editable generator,
# changing only its frame palette to match the HUD family.
original_rgb=g.rgb
g.rgb=lambda value: original_rgb({'3b2412':'142c29','f3e2c2':'e0c68e','9fd06a':'29463c'}.get(value,value))
g.UI=[];g.portrait();g.rgb=original_rgb
for n,im in g.UI:save(im,n,'ui')
# A cream collectible with a warm outline; all sizes remain exact.
im=canvas(18,10);d=ImageDraw.Draw(im)
for x,y in [(3,3),(3,6),(14,3),(14,6)]: d.ellipse((x-2,y-2,x+2,y+2),fill=rgba('705338'))
d.rectangle((3,2,14,7),fill=rgba('705338'))
for x,y in [(3,3),(3,6),(14,3),(14,6)]: d.ellipse((x-1,y-1,x+1,y+1),fill=rgba('fff0ce'))
d.rectangle((3,3,14,6),fill=rgba('fff0ce'));d.line((5,6,12,6),fill=rgba('d7b98a'))
save(im,'bone')
# Boy: redraw the code placeholder in the mockup's teal hoodie, same two poses and feet.
for step,name in [(False,'boy'),(True,'boy-step')]:
 im=canvas(18,32);d=ImageDraw.Draw(im)
 def rect(box,c): d.rectangle(box,fill=rgba(c))
 def poly(p,c): d.polygon(p,fill=rgba(c))
 poly([(5,2),(8,0),(13,1),(15,4),(14,8),(16,8),(16,10),(14,11),(13,13),(8,13),(6,10)],'593b2b')
 poly([(8,4),(13,4),(13,7),(15,8),(16,9),(14,10),(13,12),(9,12),(7,9)],'edbc8b')
 rect((10,5,13,6),'ffdab0');rect((13,7,13,8),'263633');rect((7,2,12,3),'9a6135')
 rect((5,4,8,7),'70432b');rect((8,7,9,9),'d49569')
 poly([(7,12),(11,12),(14,15),(13,21),(6,22),(4,18),(4,15)],'173e40')
 poly([(7,13),(10,13),(12,15),(11,20),(6,20),(5,16)],'25858a')
 rect((6,14,9,15),'59b6b4');rect((7,21,12,24),'293b49')
 if step:
  poly([(7,23),(10,24),(7,28),(6,30),(3,29),(4,27)],'c99068')
  poly([(10,23),(13,24),(14,28),(16,29),(15,31),(12,29)],'edbc8b')
  rect((2,29,6,31),'24343e');rect((1,31,6,31),'eee2c8')
  rect((13,29,16,30),'24343e');rect((13,31,17,31),'eee2c8')
  poly([(11,15),(13,16),(15,14),(16,15),(15,18),(12,19)],'3c9f9e');rect((15,13,16,15),'edbc8b')
 else:
  rect((7,24,9,29),'c99068');rect((11,24,13,29),'edbc8b')
  rect((6,29,9,30),'24343e');rect((10,29,14,30),'24343e')
  rect((6,31,10,31),'eee2c8');rect((10,31,15,31),'eee2c8')
  poly([(11,15),(14,15),(14,20),(12,22),(10,21)],'318f94');rect((11,21,12,23),'edbc8b')
 save(im,name,'replacement')
# Native placeholder obstacles gain readable materials without changing collisions.
for name,w,h in [('obstacle-heavyCrate',55,55),('obstacle-woodenBarrier',22,100),('obstacle-fence',14,75)]:
 im=Image.new('RGBA',(w,h),rgba('47372b'));d=ImageDraw.Draw(im)
 for x in range(2,w-2,7):
  d.rectangle((x,2,min(w-3,x+5),h-3),fill=rgba('a77b4b'))
  d.line((x,3,x,h-4),fill=rgba('d6b079'))
  d.line((x+3,7,x+3,h-8),fill=rgba('8a603d'))
 for y in [3,h-8]:
  d.rectangle((1,y,w-2,y+4),fill=rgba('c3955e'));d.line((1,y,w-2,y),fill=rgba('e6c18a'))
 if name=='obstacle-heavyCrate':
  d.line((5,6,w-6,h-6),fill=rgba('63482f'),width=6);d.line((5,h-6,w-6,6),fill=rgba('d2a66b'),width=5)
  for x,y in [(1,1),(w-8,1),(1,h-8),(w-8,h-8)]:
   d.rectangle((x,y,x+6,y+6),fill=rgba('4b5b55'));d.point((x+2,y+2),fill=rgba('bac3a9'))
  d.ellipse((23,20,31,28),outline=rgba('263b34'),width=2)
  d.rounded_rectangle((20,25,34,38),radius=2,fill=rgba('263b34'));d.line((23,27,31,27),fill=rgba('7b8b70'))
 save(im,name,'replacement')
for cracked,name in [(False,'obstacle-stoneBlock'),(True,'obstacle-crackedBlock')]:
 im=Image.new('RGBA',(24,24),rgba('444d43'));d=ImageDraw.Draw(im)
 d.rounded_rectangle((1,1,22,22),radius=3,fill=rgba('a9a58b'))
 d.line([(3,2),(20,2),(22,4)],fill=rgba('e4d8b7'),width=2)
 d.line([(22,5),(22,20),(19,22),(4,22)],fill=rgba('737a68'),width=2)
 if cracked:d.line([(11,1),(9,7),(15,11),(8,16),(10,23)],fill=rgba('444d43'),width=2)
 save(im,name,'replacement')
print('Native candidate assets:',len(list(OUT.rglob('*.png'))))
