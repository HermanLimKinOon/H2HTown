"""Author an independent mirror-only likeness in Blender, using local reference art.
Never writes the world assets or the existing custom character. No cloud services.
"""
import bpy,sys,math,random
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
P=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(P/'assets/characters/mirror-sculpted.blend'))
C=bpy.data.collections['Mirror export'];rig=bpy.data.objects['Mirror_MakeHuman_Rig']
out=[o for o in C.objects if o.type=='MESH' and not o.hide_render]
body=next(o for o in out if o.name=='Body')
source_head=next(o for o in out if o.name=='Hair_swept')
keys=[k.name for k in body.data.shape_keys.key_blocks if k.name!='Basis']
def gauss(x,c,w):return math.exp(-((x-c)/w)**2)
def lerp_knots(x,knots):
    if x<=knots[0][0]:return knots[0][1]
    for (a,b),(c,d) in zip(knots,knots[1:]):
        if x<=c:return b+(d-b)*(x-a)/(c-a)
    return knots[-1][1]
# Reference units measured from the supplied front view: 970 pixels from hair
# crown to soles, a 32-pixel interocular distance, and a 40-pixel closed smile.
unit=.00195;image_cx=495.;image_floor=992.
def warp(p):
    x,y,z=p;a=abs(x);sign=1 if x>=0 else -1
    if z>=1.54:
        f=min(1,max(0,(-y+.035)/.13))
        taper=lerp_knots(z,[(1.54,1),(1.60,.82),(1.635,.84),(1.66,.90),(1.70,.94),(1.7355,.97),(1.77,.96),(1.82,.97),(1.89,1)])
        x*=1+(taper-1)*f
        # Match lip span, nasal wings, cheek planes and almond eyelid openings.
        x+=sign*.0125*gauss(a,.026,.018)*gauss(z,1.658,.017)*f
        x+=sign*.003*gauss(a,.011,.007)*gauss(z,1.690,.016)*f
        eye=gauss(a,.033,.025)*gauss(z,1.7355,.025)*f
        z-=(z-1.7355)*.08*eye
        y-=.001*gauss(a,.033,.024)*gauss(z,1.737,.025)*f
        y-=.0025*gauss(a,.048,.023)*gauss(z,1.700,.026)*f
        # A defined adult chin, less ball-shaped cheek/jaw transition.
        y-=.004*gauss(x,0,.035)*gauss(z,1.610,.025)*f
        z=lerp_knots(z,[(1.54,1.54),(1.57,1.569),(1.61,1.636),(1.658,1.6848),(1.699,1.7199),(1.7355,1.749),(1.76,1.771),(1.80,1.816),(1.87,1.879),(2,2)])
    else:
        # Narrower waist, stronger shoulder line, lean limbs and a longer neck.
        x*=1-.045*gauss(z,1.05,.17)+.035*gauss(z,1.43,.11)
        y*=1-.035*gauss(z,1.10,.24)
        if 1.45<z<1.54:x*=1-.065*gauss(z,1.52,.055)
    return Vector((x,y,z))
for obj in out:
    for key in obj.data.shape_keys.key_blocks:
        for v in key.data:v.co=warp(v.co)
    basis=obj.data.shape_keys.key_blocks[0]
    for v,b in zip(obj.data.vertices,basis.data):v.co=b.co
    obj.data.update()
# Preserve bone rest pivots while following the same longitudinal reshape.
for obj in bpy.context.selected_objects:obj.select_set(False)
rig.hide_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    bone.head=warp(bone.head);bone.tail=warp(bone.tail)
bpy.ops.object.mode_set(mode='OBJECT')

# Vertex-colour painting sampled from the supplied artwork on the real 3D skin.
# Front-view colours are blended onto a warm, continuous side/back complexion.
ref=bpy.data.images.load(str(P/'assets/characters/blender-reference/reference.png'));ref.pack()
w,h=ref.size
pixels=np.array(ref.pixels[:],dtype=np.float32).reshape((h,w,4))
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
base=Vector(tuple(linear(c) for c in (.84,.57,.37)))
def sample(u,v):
    u=max(0,min(w-1,float(u)));v=max(0,min(h-1,h-1-float(v)))
    ix=int(u);iy=int(v);tx=u-ix;ty=v-iy
    a=pixels[iy,ix,:3]*(1-tx)+pixels[iy,min(w-1,ix+1),:3]*tx
    b=pixels[min(h-1,iy+1),ix,:3]*(1-tx)+pixels[min(h-1,iy+1),min(w-1,ix+1),:3]*tx
    return a*(1-ty)+b*ty
colors=body.data.color_attributes.get('SculptSkin')
for v in body.data.vertices:
    x,y,z=v.co
    color=base.copy()
    if 1.62<z<1.835:
        u=image_cx+x/unit;vv=image_floor-z/unit
        rgb=sample(u,vv)
        # Reject studio background and hair above the painted forehead.
        chroma=float(max(rgb)-min(rgb));luma=float(sum(rgb)/3)
        valid=chroma>.09 and not (vv<90 and luma<.48) and not (abs(u-image_cx)>34 and vv<140)
        if z>1.765:
            rgb=sample(497,75);valid=True
        weight=min(1,max(0,(-y-.045)/.065))*min(1,max(0,(z-1.62)/.02))*min(1,max(0,(1.835-z)/.015))
        if valid:color=color.lerp(Vector(tuple(linear(float(c)) for c in rgb)),weight*.90)
    colors.data[v.index].color=(*color,1)
body['mirrorFaceProfile']='blender-reference-likeness-v1';body['mirrorPreviewOnly']=True
# Softer lip/skin response; real eye geometry remains separate and glossy.
for m in body.data.materials:
    shader=m.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.58
    shader.inputs['Subsurface Weight'].default_value=.09
for obj in out:
    if obj.name.startswith('Eyes_'):
        for m in obj.data.materials:
            if not m:continue
            shader=m.node_tree.nodes.get('Principled BSDF')
            if shader:shader.inputs['Roughness'].default_value=.19 if 'White' in m.name else .24

# Exact supplied shirt artwork is a replaceable local texture, not generated art.
art=bpy.data.images.new('Reference mountain print',width=256,height=256,alpha=False)
art_pixels=np.ones((256,256,4),dtype=np.float32)
for row in range(256):
    for col in range(256):
        # Include the original ivory paper/cotton margin around the print.
        art_pixels[row,col,:3]=sample(426+col/255*128,354-row/255*135)
art.pixels.foreach_set(art_pixels.ravel());art.filepath_raw=str(P/'assets/characters/blender-reference/shirt-print.png');art.file_format='PNG';art.save();art.pack()
for m in bpy.data.materials:
    if m.name=='Reference_Mountain_Graphic':
        for node in m.node_tree.nodes:
            if node.type=='TEX_IMAGE':node.image=art

tee=next(o for o in out if o.name=='Outfit_reference')
if tee.data.uv_layers.get('GraphicUV'):
    for loop in tee.data.uv_layers['GraphicUV'].data:
        loop.uv.x=(loop.uv.x-.5)/.82+.5
        loop.uv.y=(loop.uv.y-.5)/.82+.5+.02/(.29*.82)

surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[tuple(p.vertices) for p in body.data.polygons])
center=Vector((0,-.012,1.790));rx,ry,rz=.092,.116,.095
head_tree=KDTree(len(source_head.data.vertices))
for v in source_head.data.vertices:head_tree.insert(v.co,v.index)
head_tree.balance()
def material(name,c,rough=.5):
    m=bpy.data.materials.new(name);m.use_nodes=True
    sh=m.node_tree.nodes.get('Principled BSDF');sh.inputs['Base Color'].default_value=(*c,1);sh.inputs['Roughness'].default_value=rough
    return m
hair_mats=[material('Likeness_Chestnut_'+str(i),c,.60+i*.02) for i,c in enumerate([(.062,.027,.013),(.090,.043,.023),(.115,.057,.031),(.075,.033,.016)])]
def on_head(p,margin=.004):
    d=(p-center).normalized();hit,_,_,_=surface.ray_cast(center,d,.25)
    if hit:
        length=min((hit-center).length+.018,max((hit-center).length+margin,(p-center).length))
        return center+d*length
    return p
verts=[];faces=[];mat_ids=[]
def add_lock(points,width,depth,seed):
    points=[on_head(Vector(p),.006) for p in points];start=len(verts);rings=24;sides=12
    def curve(t):
        i=min(len(points)-2,int(t*(len(points)-1)));u=t*(len(points)-1)-i
        a,b,c,d=[points[max(0,min(len(points)-1,j))] for j in (i-1,i,i+1,i+2)]
        return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
    for i in range(rings):
        t=i/(rings-1);p=on_head(curve(t),.005)
        tangent=(curve(min(1,t+.003))-curve(max(0,t-.003))).normalized()
        normal=Vector((p.x/rx**2,(p.y-center.y)/ry**2,(p.z-center.z)/rz**2)).normalized()
        side=tangent.cross(normal).normalized();normal=side.cross(tangent).normalized()
        taper=(.46+.54*math.sin(math.pi*t)**.65)*(1-.985*t**7)
        for j in range(sides):
            a=j*math.tau/sides;groove=1+.12*math.cos(a*6+t*3+seed*.3)
            verts.append(p+side*math.cos(a)*width*taper+normal*math.sin(a)*depth*taper*groove)
    for i in range(rings-1):
        for j in range(sides):
            a=start+i*sides+j;b=start+i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides));mat_ids.append(1 if j in (1,2,3) else 2 if j==4 and seed%3==0 else 0 if j in (8,9) else 3)
    faces.append(tuple(start+j for j in reversed(range(sides))));mat_ids.append(0)
    faces.append(tuple(start+(rings-1)*sides+j for j in range(sides)));mat_ids.append(0)
def scalp(theta,lat,margin=.004):
    return on_head(center+Vector((rx*math.sin(lat)*math.sin(theta),-ry*math.sin(lat)*math.cos(theta),rz*math.cos(lat))),margin)
# A fitted, continuous scalp underneath the layered locks.
for row in range(24):
    for col in range(96):
        t=col*math.tau/96;cut=2.22-1.05*(math.cos(t)+1)/2
        lat=.005+(cut-.005)*row/23
        p=scalp(t,lat)
        fullness=gauss(math.atan2(math.sin(t),math.cos(t)),0,.95)*gauss(lat,.80,.48)
        p+= (p-center).normalized()*(.0015*math.sin(t*13+lat*9)*math.sin(lat)**2)
        verts.append(p)
for row in range(23):
    for col in range(96):
        a=row*96+col;b=row*96+(col+1)%96;faces.append((a,b,b+96,a+96));mat_ids.append(0)
# Authored quiff / fringe curves follow the reference's front-view wave shapes.
def image_lock(points,y,width,depth,seed):
    add_lock([((u-image_cx)*unit,y+offset,(image_floor-v)*unit) for u,v,offset in points],width,depth,seed)
for i in range(6):
    image_lock([(515-i*.4,60,0),(518-i*1.5,43-i*1.5,-.002),(506-i*3.0,30-i*.7,.001),(490-i*3.5,34-i*.6,.004),(474-i*2.8,44-i*.7,.008),(458-i*1.5,43-i*.8,.012)],-.104+i*.010,.0115,.0055,10+i)
for i in range(7):
    shift=i*3.1
    image_lock([(513-shift*.12,61,0),(509-shift*.25,46,.002),(497-shift*.65,46,.001),(490-shift*.8,57,0),(477-shift*.8,65,.004),(465-shift*.7,63,.009)],-.140+i*.003,.0095,.0055,30+i)
image_lock([(506,55,0),(497,50,0),(491,54,-.001),(490,65,-.002),(483,74,0)],-.145,.007,.0045,48)
for i in range(6):
    image_lock([(513+i*.7,58,0),(523+i*1.5,44-i*1.5,.005),(536+i*.8,47-i*.4,.010),(538+i*.8,59,.015),(546+i*.2,61+i*.7,.025)],-.125+i*.010,.009,.0055,50+i)
for sign in (-1,1):
    for row in range(4):
        for col in range(6):
            t=sign*(.9+col*.39);lat=.60+row*.30
            add_lock([scalp(t-sign*.20,lat-.13,.004),scalp(t,lat,.009),scalp(t+sign*.20,lat+.13,.010),scalp(t+sign*.30,lat+.28,.005)],.009,.0045,70+row*6+col)
    add_lock([scalp(sign*1.13,1.2,.004),scalp(sign*1.24,1.4,.006),scalp(sign*1.3,1.62,.003)],.005,.003,98)
for i in range(7):
    t=1.7+i*.35
    add_lock([scalp(t,.25,.003),scalp(t+.2,.5,.011),scalp(t+.3,.8,.009),scalp(t+.4,1.10,.004)],.010,.005,110+i)

def new_head_mesh(name,vs,fs,mats,source,role):
    mesh=bpy.data.meshes.new(name+' authored mesh');mesh.from_pydata(vs,[],fs);mesh.update()
    obj=bpy.data.objects.new(name,mesh);C.objects.link(obj);obj.parent=rig;obj['mirrorRole']=role
    for m in mats:mesh.materials.append(m)
    for p in mesh.polygons:p.use_smooth=True
    group=obj.vertex_groups.new(name='head');group.add(list(range(len(vs))),1,'REPLACE')
    arm=obj.modifiers.new('Shared head rig','ARMATURE');arm.object=rig
    kd=KDTree(len(source.data.vertices))
    for v in source.data.vertices:kd.insert(v.co,v.index)
    kd.balance();nearest=[kd.find(v.co)[1] for v in mesh.vertices]
    obj.shape_key_add(name='Basis')
    for name in keys:
        key=obj.shape_key_add(name=name);target=source.data.shape_keys.key_blocks[name]
        for i,v in enumerate(mesh.vertices):
            j=nearest[i];key.data[i].co=v.co+target.data[j].co-source.data.vertices[j].co
    out.append(obj);return obj
for obj in list(out):
    if obj.name.startswith('Hair_swept'):
        out.remove(obj);obj.hide_render=True;obj.hide_set(True);obj.name='Old_'+obj.name
hair=new_head_mesh('Hair_swept',verts,faces,hair_mats,source_head,'hair')
for p,m in zip(hair.data.polygons,mat_ids):p.material_index=m
hair['mirrorHairProfile']='reference-wave-sculpt-v1'
# Replace the oversized solid brows with tapered arches matched to the artwork.
old_brow=next(o for o in out if o.name=='Eyebrows_sculpted')
verts=[];faces=[];mat_ids=[]
for sign in (-1,1):
    points=[]
    for a,z in [(.015,1.771),(.027,1.775),(.044,1.774),(.057,1.768),(.063,1.761)]:
        hit,_,_,_=surface.ray_cast(Vector((sign*a,-.4,z)),Vector((0,1,0)))
        points.append((sign*a,hit.y-.0012 if hit else -.15,z))
    add_lock(points,.0034,.0012,150)
brow=new_head_mesh('Likeness_Brows',verts,faces,[material('Likeness_Brows',(.045,.018,.008),.76)],old_brow,'hair')
out.remove(old_brow);old_brow.hide_render=True;old_brow.hide_set(True);old_brow.name='Old_Brows';brow.name='Eyebrows_sculpted'
# Cream rubber soles, grey leather uppers, green side panels and physical laces.
# Each shoe follows its foot bone; editable parts are retained in the Blender file.
old_shoes=next(o for o in out if o.name=='Shoes')
shoe_mats=[material('Sneaker_Cream_Rubber',(.82,.78,.66),.85),material('Sneaker_Grey_Leather',(.39,.41,.39),.72),material('Sneaker_Ivory_Leather',(.89,.87,.78),.70),material('Sneaker_Forest_Panels',(.075,.16,.12),.75)]
shoe_vs=[];shoe_fs=[];shoe_mi=[];foot_ranges=[]
def tube(points,radius,mat_index):
    start=len(shoe_vs);count=8
    for i,p in enumerate(points):
        p=Vector(p);t=(Vector(points[min(len(points)-1,i+1)])-Vector(points[max(0,i-1)])).normalized()
        axis=t.cross(Vector((0,1,0))).normalized();other=axis.cross(t).normalized()
        for j in range(count):shoe_vs.append(p+axis*math.cos(j*math.tau/count)*radius+other*math.sin(j*math.tau/count)*radius)
    for i in range(len(points)-1):
        for j in range(count):
            a=start+i*count+j;b=start+i*count+(j+1)%count;shoe_fs.append((a,b,b+count,a+count));shoe_mi.append(mat_index)
for sign,side in [(1,'l'),(-1,'r')]:
    start=len(shoe_vs);points=[v.co for v in old_shoes.data.vertices if v.co.x*sign>0]
    minx=min(p.x for p in points);maxx=max(p.x for p in points);cx=(minx+maxx)/2
    front=min(p.y for p in points)-.012;back=max(p.y for p in points)+.006;bottom=min(p.z for p in points)
    width=(maxx-minx)/2*1.03;length=back-front
    stations=[(0,.22),(.08,.70),(.25,.94),(.45,1),(.65,.97),(.85,.91),(.96,.65),(1,.15)]
    origin=len(shoe_vs)
    for level in range(3):
        for t,factor in stations:
            yy=front+t*length;half=width*factor
            zz=bottom+[0,.026,.036][level]
            for sx in (-1,1):shoe_vs.append(Vector((cx+sx*half,yy,zz)))
    n=len(stations)*2
    for level in range(2):
        for i in range(len(stations)-1):
            for edge in (0,1):
                a=origin+level*n+i*2+edge;b=origin+level*n+(i+1)*2+edge;shoe_fs.append((a,b,b+n,a+n));shoe_mi.append(0)
    for level in (0,2):
        for i in range(len(stations)-1):
            a=origin+level*n+i*2;shoe_fs.append((a,a+1,a+3,a+2));shoe_mi.append(0)
    # Cross sections form a rounded leather toe box and raised tongue/heel.
    upper_start=len(shoe_vs);arc=10
    for t,factor in stations:
        yy=front+t*length;height=.052+.075*math.sin(math.pi*t*.73)**.8
        for j in range(arc):
            theta=j*math.pi/(arc-1)
            shoe_vs.append(Vector((cx+width*factor*math.cos(theta),yy,bottom+.031+height*math.sin(theta))))
    for i in range(len(stations)-1):
        for j in range(arc-1):
            a=upper_start+i*arc+j;shoe_fs.append((a,a+arc,a+arc+1,a+1));shoe_mi.append(1 if i<4 or j in (0,1,8) else 2)
    # Close the rounded toe and heel; feet cannot show through open cross sections.
    shoe_fs.append(tuple(upper_start+j for j in reversed(range(arc))));shoe_mi.append(1)
    shoe_fs.append(tuple(upper_start+(len(stations)-1)*arc+j for j in range(arc)));shoe_mi.append(2)
    for end in (0,len(stations)-1):
        for level in range(2):
            a=origin+level*n+end*2;shoe_fs.append((a,a+1,a+n+1,a+n));shoe_mi.append(0)
    for k in range(6):
        t=.38+k*.065;yy=front+t*length;hh=bottom+.031+.052+.075*math.sin(math.pi*t*.73)**.8
        tube([(cx-width*.63,yy,hh-.011),(cx,yy-.003,hh+.002),(cx+width*.63,yy,hh-.011)],.0018,2)
    for sx in (-1,1):
        ids=[]
        for t,zz,spread in [(.29,.059,.95),(.48,.052,1.005),(.82,.080,.96),(.67,.081,1.0),(.42,.067,1.0)]:
            ids.append(len(shoe_vs));shoe_vs.append(Vector((cx+sx*width*spread,front+t*length,bottom+zz)))
        shoe_fs.append(tuple(ids));shoe_mi.append(3)
    foot_ranges.append((side,start,len(shoe_vs)))
shoe_mesh=bpy.data.meshes.new('Reference sneaker geometry');shoe_mesh.from_pydata(shoe_vs,[],shoe_fs);shoe_mesh.update()
shoes=bpy.data.objects.new('Reference_Sneakers',shoe_mesh);C.objects.link(shoes);shoes.parent=rig;shoes['mirrorRole']='shoes'
for m in shoe_mats:shoe_mesh.materials.append(m)
for polygon,index in zip(shoe_mesh.polygons,shoe_mi):polygon.material_index=index;polygon.use_smooth=True
for side,start,end in foot_ranges:
    vg=shoes.vertex_groups.new(name='foot_'+side);vg.add(list(range(start,end)),1,'REPLACE')
arm=shoes.modifiers.new('Foot skeleton','ARMATURE');arm.object=rig
shoes.shape_key_add(name='Basis')
for name in keys:shoes.shape_key_add(name=name)
out.remove(old_shoes);old_shoes.hide_set(True);old_shoes.hide_render=True;old_shoes.name='Old_Shoes';shoes.name='Shoes';out.append(shoes)
# Record measured authoring landmarks for inspection and regression checks.
rig['mirrorPreviewOnly']=True;rig['referenceImage']='blender-reference/reference.png'
for obj in out:obj.hide_set(False);obj.hide_render=False
bpy.ops.object.select_all(action='DESELECT')
for obj in out+[rig]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(P/'assets/characters/blender-reference.blend'))
bpy.ops.export_scene.gltf(filepath=str(P/'public/game3d/blender-reference.glb'),export_format='GLB',use_selection=True,
    export_morph=True,export_morph_normal=False,export_skins=True,export_animations=False,export_extras=True,
    export_copyright='Local Blender likeness study; MakeHuman Community base topology/rig/clothes CC0; reference artwork supplied by user.')
print('BLENDER_REFERENCE_EXPORT',len(out),'parts',len(keys),'shape targets',flush=True)
# Optional local portrait renders, without changing the saved export pose.
if '--render' in sys.argv:
    for obj in list(bpy.data.objects):
        if obj.type=='MESH' and obj not in out:obj.hide_render=True
    for obj in out:
        if obj.name.startswith('Hair_'):obj.hide_render=obj!=hair
        if obj.name.startswith('Outfit_'):obj.hide_render=obj.name!='Outfit_reference'
    # Relax the arms in armature coordinates, matching the game preview stance.
    def aim(bone_name,child_name,direction):
        b=rig.pose.bones[bone_name];child=rig.pose.bones[child_name]
        origin=b.head.copy();old=(child.head-origin).normalized();d=Vector(direction).normalized()
        delta=old.rotation_difference(d)
        b.matrix=Matrix.Translation(origin)@delta.to_matrix().to_4x4()@Matrix.Translation(-origin)@b.matrix
        bpy.context.view_layer.update()
    for side,sign in [('l',1),('r',-1)]:
        aim('upperarm_'+side,'lowerarm_'+side,(sign*.28,.025,-1))
        aim('lowerarm_'+side,'hand_'+side,(sign*.06,-.10,-1))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.world.color=(.30,.30,.30)
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if 'Medium High Contrast' in [] else 'None'
    for name,loc,power,size in [('Key',(-3,-4,5),220,4),('Fill',(3,-2,3),100,3),('Rim',(1,3,4),180,3)]:
        light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size
        obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,1.4))-obj.location).to_track_quat('-Z','Y').to_euler()
    camdata=bpy.data.cameras.new('Portrait camera');cam=bpy.data.objects.new('Portrait camera',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO'
    scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    for name,location,target,scale in [('face',(0,-5,1.76),(0,0,1.76),.38),('three-quarter',(2.4,-5,1.76),(0,0,1.76),.38),('body',(0,-5,1.0),(0,0,1.0),2.10)]:
        cam.location=location;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=scale
        scene.render.filepath='/private/tmp/h2h-blender-reference-'+name+'.png';bpy.ops.render.render(write_still=True)
