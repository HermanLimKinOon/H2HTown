"""Add fitted physique morphs to the existing custom character, preserving its basis.
Run in Blender: --background --python scripts/add-character-physique.py -- PROJECT
"""
import bpy
import sys
import math
from pathlib import Path
from mathutils import Vector

project=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(project/'assets/characters/mirror-sculpted.blend'))
collection=bpy.data.collections['Mirror export']
rig=bpy.data.objects['Mirror_MakeHuman_Rig']
meshes=[o for o in collection.objects if o.type=='MESH' and not o.hide_render]
controls=['bodyFat','muscle','shoulders','chest','waist','hips','arms','legs']
def g(x,c,w):return math.exp(-((x-c)/w)**2)
def shape(p,control,amount):
    x,y,z=p;side=1 if x>=0 else -1;a=abs(x)
    if z>=1.54:return Vector(p)
    neck_fade=min(1,max(0,(z-1.45)/.09))
    amount*=1-neck_fade*neck_fade*(3-2*neck_fade)
    # Smooth local brushes affect body and fitted garments equally. Feet, hands
    # and face remain unchanged so the shared rig and locomotion stay usable.
    trunk=math.exp(-(a/.245)**8)
    torso=g(z,1.18,.27)*trunk
    arm=1/(1+math.exp(-(a-.205)*70))*1/(1+math.exp((a-.55)*60))
    axis=1.43-.32*max(0,a-.2)
    arm*=g(z,axis,.12)
    leg=g(z,.58,.28)*min(1,max(0,(z-.12)/.15))
    if control=='bodyFat':
        x*=1+amount*.24*torso;y*=1+amount*.42*torso
    elif control=='muscle':
        y*=1+amount*(.28*g(z,1.34,.14)*trunk+.20*arm+.12*leg)
        x+=side*amount*.009*g(z,1.40,.12)
        z+=(z-axis)*amount*.20*arm
    elif control=='shoulders':
        x+=side*amount*.035*g(z,1.43,.11)*min(1,a/.16)
    elif control=='chest':
        weight=g(z,1.32,.13)*trunk;x*=1+amount*.20*weight;y*=1+amount*.30*weight
    elif control=='waist':
        weight=g(z,1.10,.11)*trunk;x*=1+amount*.28*weight;y*=1+amount*.35*weight
    elif control=='hips':
        weight=g(z,.94,.12)*trunk;x*=1+amount*.26*weight;y*=1+amount*.22*weight
    elif control=='arms':
        y*=1+amount*.33*arm;z+=(z-axis)*amount*.33*arm
    elif control=='legs':
        x+=(x-side*.09)*amount*.33*leg;y*=1+amount*.30*leg
    return Vector((x,y,z))

def face_angle(p,control,amount):
    x,y,z=p
    if control=='eyeTilt':
        side=1 if x>=0 else -1
        cx=side*.03265;cz=1.73551
        radius=math.hypot(x-cx,z-cz)
        t=min(1,max(0,(radius-.024)/.027))
        front=min(1,max(0,(-y-.055)/.05))
        angle=amount*side*.18*(1-t*t*(3-2*t))*front
        dx=x-cx;dz=z-cz
        return Vector((cx+dx*math.cos(angle)-dz*math.sin(angle),y,cz+dx*math.sin(angle)+dz*math.cos(angle)))
    lip_fade=min(1,max(0,(z-1.632)/.026))
    weight=g(x,0,.073)*g(y,-.135,.070)*g(z,1.617,.045)*(1-lip_fade*lip_fade*(3-2*lip_fade))
    angle=amount*.22*weight
    dy=y+.06;dz=z-1.66
    return Vector((x,-.06+dy*math.cos(angle)-dz*math.sin(angle),1.66+dy*math.sin(angle)+dz*math.cos(angle)))

# Local facial brushes share coordinates across skin, brows, eyes and teeth.
# Existing basis positions and all prior shape keys remain unchanged.
details=['cheekSize','lowerFaceWidth','faceLength','underneck','earSize','browThickness','browArch','browRotate','browOrbit','foreheadDepth','eyeWidth','outerEyeHeight','eyeDepth','eyeHeight','orbitHeight','noseSize','nostrilWidth','noseHeight','noseTipTurn','noseTipHeight','mouthHeight','mouthCorner','lipThickness','upperLipPinch','lowerLipPinch','chinDepth','chinPoint','jawDepth','jawAngle']
def detail_shape(p,control,amount,obj_name):
    x,y,z=p
    if z<1.50:return Vector(p)
    a=abs(x);side=1 if x>=0 else -1
    front=min(1,max(0,(-y-.055)/.05))
    cx=side*.03265;cz=1.73551
    radius=math.hypot(x-cx,z-cz)
    t=min(1,max(0,(radius-.024)/.027))
    eye=(1-t*t*(3-2*t))*front
    brow=g(z,1.759,.016)*g(a,.034,.032)*front
    nose=g(x,0,.024)*g(z,1.699,.045)*front
    tip=g(x,0,.018)*g(z,1.689,.018)*front
    mouth=g(x,0,.043)*g(z,1.657,.023)*front
    chin=g(x,0,.060)*g(z,1.619,.032)*front
    jaw=g(a,.054,.037)*g(z,1.637,.036)*min(1,max(0,(-y+.02)/.10))
    if control=='cheekSize':
        w=g(a,.052,.029)*g(z,1.695,.035)*front;x+=side*amount*.009*w;y-=amount*.006*w
    elif control=='lowerFaceWidth':x*=1+amount*.20*g(z,1.647,.053)*front
    elif control=='faceLength':
        fade=min(1,max(0,(z-1.56)/.06));z+=(z-1.77)*amount*.14*fade
    elif control=='underneck':z+=amount*.015*g(z,1.577,.036)*g(y,-.04,.08)
    elif control=='earSize':
        w=g(a,.085,.021)*g(z,1.70,.05)*g(y,-.003,.06);x+=side*amount*.010*w;z+=(z-1.70)*amount*.30*w
    elif control=='browThickness':
        if 'Eyebrows' in obj_name:z+=(z-1.759)*amount*.65
    elif control=='browArch':z+=amount*.010*brow*g(a,.038,.018)
    elif control=='browRotate':z+=amount*.012*brow*(a-.033)/.033
    elif control=='browOrbit':y-=amount*.009*brow
    elif control=='foreheadDepth':y-=amount*.012*g(z,1.790,.038)*front
    elif control=='eyeWidth':x+=(x-cx)*amount*.27*eye
    elif control=='outerEyeHeight':z+=amount*.009*eye*min(1,max(0,(a-.026)/.022))
    elif control=='eyeDepth':y+=amount*.009*eye
    elif control=='eyeHeight':z+=amount*.010*eye
    elif control=='orbitHeight':z+=amount*.010*g(z,1.744,.040)*g(a,.033,.035)*front
    elif control=='noseSize':
        x*=1+amount*.20*nose;y+=(y+.12)*amount*.20*nose;z+=(z-1.710)*amount*.18*nose
    elif control=='nostrilWidth':x+=x*amount*.32*g(z,1.683,.014)*g(a,.015,.012)*front
    elif control=='noseHeight':z+=amount*.010*nose
    elif control=='noseTipTurn':
        angle=amount*.27*tip;dy=y+.145;dz=z-1.705;y=-.145+dy*math.cos(angle)-dz*math.sin(angle);z=1.705+dy*math.sin(angle)+dz*math.cos(angle)
    elif control=='noseTipHeight':z+=amount*.009*tip
    elif control=='mouthHeight':z+=amount*.010*mouth
    elif control=='mouthCorner':z+=amount*.008*g(a,.026,.012)*g(z,1.657,.017)*front
    elif control=='lipThickness':z+=(z-1.657)*amount*.55*mouth
    elif control=='upperLipPinch':
        w=g(x,0,.014)*g(z,1.665,.009)*front;z-=amount*.004*w;y+=amount*.004*w
    elif control=='lowerLipPinch':
        w=g(x,0,.018)*g(z,1.650,.010)*front;z+=amount*.004*w;y+=amount*.004*w
    elif control=='chinDepth':y-=amount*.014*chin
    elif control=='chinPoint':x-=x*amount*.32*chin;z-=amount*.005*chin
    elif control=='jawDepth':y-=amount*.013*jaw
    elif control=='jawAngle':x+=side*amount*.011*jaw;z-=amount*.006*jaw
    return Vector((x,y,z))

for obj in meshes:
    if not obj.data.shape_keys:obj.shape_key_add(name='Basis')
    basis=obj.data.shape_keys.key_blocks[0]
    for control in controls:
        for suffix,amount in [('Minus',-1),('Plus',1)]:
            name=control+suffix
            key=obj.data.shape_keys.key_blocks.get(name) or obj.shape_key_add(name=name)
            for p,base in zip(key.data,basis.data):p.co=shape(base.co,control,amount)
            key.value=0
    for control in ['eyeTilt','chinAngle']:
        for suffix,amount in [('Minus',-1),('Plus',1)]:
            name=control+suffix
            key=obj.data.shape_keys.key_blocks.get(name) or obj.shape_key_add(name=name)
            for p,base in zip(key.data,basis.data):p.co=face_angle(base.co,control,amount)
            key.value=0
    for control in details:
        for suffix,amount in [('Minus',-1),('Plus',1)]:
            name=control+suffix
            key=obj.data.shape_keys.key_blocks.get(name) or obj.shape_key_add(name=name)
            for p,base in zip(key.data,basis.data):p.co=detail_shape(base.co,control,amount,obj.name)
            key.value=0
    obj['physiqueControlsVersion']=1
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes+[rig]:obj.hide_set(False);obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(project/'assets/characters/mirror-sculpted.blend'))
bpy.ops.export_scene.gltf(filepath=str(project/'public/game3d/mirror-sculpted.glb'),export_format='GLB',use_selection=True,
    export_apply=False,export_morph=True,export_morph_normal=True,export_skins=True,export_animations=False,export_extras=True,
    export_copyright='H2H custom character; MakeHuman Community assets CC0 1.0.')
print('PHYSIQUE_EXPORT',len(meshes),'parts',len(controls),'controls',flush=True)
