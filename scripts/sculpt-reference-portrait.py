"""Reference portrait revision 2: anatomical sculpt, procedural skin, fitted fine hair.
Builds in Blender locally. --draft renders only; --export-only exports reviewed source.
No existing model or world save is modified.
"""
import bpy,sys,math,random
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
P=Path(sys.argv[sys.argv.index('--')+1]);target=P/'assets/characters/blender-reference-v2.blend'
def refine_eyes(out,rig):
    if rig.get('portraitEyeRefinement'):return
    for side,suffix in [(-1,'L'),(1,'R')]:
        iris=next(o for o in out if o.name=='Eyes_Iris_'+str(side));sclera=next(o for o in out if o.name=='Eyes_Sculpted_'+suffix)
        for key in iris.data.shape_keys.key_blocks:
            co=np.array([v.co[:] for v in key.data])
            ix=co[:,0].mean();iz=co[:,2].mean()
            co[:,0]=ix+(co[:,0]-ix)*1.08
            co[:,2]=iz+(co[:,2]-iz)*1.08-.0003
            co[:,1]-=.0004
            key.data.foreach_set('co',co.astype(np.float32).ravel())
        basis=iris.data.shape_keys.key_blocks[0];values=np.empty(len(basis.data)*3,dtype=np.float32);basis.data.foreach_get('co',values);iris.data.vertices.foreach_set('co',values);iris.data.update()
    rig['portraitEyeRefinement']=True

if '--export-only' in sys.argv or '--refine-eyes' in sys.argv or '--repair-eyes' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(target));rig=bpy.data.objects['Mirror_MakeHuman_Rig']
    out=[bpy.data.objects[name] for name in rig['portraitExportObjects']]
else:
    bpy.ops.wm.open_mainfile(filepath=str(P/'assets/characters/blender-reference.blend'))
    C=bpy.data.collections['Mirror export'];rig=bpy.data.objects['Mirror_MakeHuman_Rig']
    out=[o for o in C.objects if o.type=='MESH' and not o.hide_render]
    body=next(o for o in out if o.name=='Body');old_hair=next(o for o in out if o.name=='Hair_swept')
    names=[k.name for k in body.data.shape_keys.key_blocks if k.name!='Basis']
    def g(x,c,w):return np.exp(-((x-c)/w)**2)
    def srgb(c):
        c=np.asarray(c,dtype=float);return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
    def sculpt(points):
        p=np.array(points,dtype=float);x,y,z=p.T.copy();a=abs(x);front=np.clip((-y-.03)/.10,0,1)
        cheek=g(a,.046,.032)*g(z,1.718,.036)*front
        x*=1-.025*g(z,1.67,.063)*front
        x*=1+.08*g(z,1.650,.025)*front
        y-=.0015*cheek
        # Open the real eyelids slightly, retaining their existing anatomical joins.
        eye=g(a,.032,.027)*g(z,1.749,.027)*front
        z+=(z-1.749)*.11*eye
        z-=.014*g(z,1.650,.024)*front
        z-=.003*g(z,1.691,.018)*front
        z+=.003*g(z,1.780,.022)*front
        # Round the tip and soften the sides of the nose without a painted overlay.
        nose=g(x,0,.019)*g(z,1.718,.021)*front
        y+=.0015*nose
        return np.column_stack((x,y,z)).astype(np.float32)
    for obj in out:
        for key in obj.data.shape_keys.key_blocks:
            co=np.empty(len(key.data)*3,dtype=np.float32);key.data.foreach_get('co',co)
            key.data.foreach_set('co',sculpt(co.reshape((-1,3))).ravel())
        basis=obj.data.shape_keys.key_blocks[0];co=np.empty(len(basis.data)*3,dtype=np.float32);basis.data.foreach_get('co',co);obj.data.vertices.foreach_set('co',co)
        obj.data.update()
    def material(name,color,rough=.58,vertex=False):
        m=bpy.data.materials.new(name);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF')
        s.inputs['Base Color'].default_value=(*srgb(color),1);s.inputs['Roughness'].default_value=rough
        if vertex:
            s.inputs['Subsurface Weight'].default_value=.08
            attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='PortraitSkin'
            m.node_tree.links.new(attr.outputs['Color'],s.inputs['Base Color'])
        return m
    skin=material('Portrait_Skin',(.91,.66,.46),.57,True)
    # Entirely procedural skin/lip colour: no reference image pixels on the face.
    pts=np.array([v.co[:] for v in body.data.vertices]);x,y,z=pts.T
    color=np.tile(srgb((.91,.66,.46)),(len(pts),1));front=np.clip((-y-.085)/.065,0,1)
    blush=(g(abs(x),.049,.026)*g(z,1.714,.024)*front*.10)[:,None]
    color=color*(1-blush)+srgb((.85,.45,.33))*blush
    lip_front=np.clip((-y-.150)/.015,0,1)
    upper=(g(x,0,.031)*g(z,1.688,.0045)*lip_front*.95)[:,None]
    lower=(g(x,0,.032)*g(z,1.680,.0048)*lip_front*.88)[:,None]
    seam=(g(x,0,.031)*g(z,1.683,.0012)*lip_front*.34)[:,None]
    color=color*(1-upper)+srgb((.64,.34,.26))*upper
    color=color*(1-lower)+srgb((.79,.46,.35))*lower
    color=color*(1-seam)+srgb((.43,.235,.18))*seam
    for attr in list(body.data.color_attributes):body.data.color_attributes.remove(attr)
    attr=body.data.color_attributes.new(name='PortraitSkin',type='FLOAT_COLOR',domain='POINT')
    attr.data.foreach_set('color',np.column_stack((color,np.ones(len(pts)))).astype(np.float32).ravel())
    body.data.materials.clear();body.data.materials.append(skin)
    for f in body.data.polygons:f.material_index=0;f.use_smooth=True
    body['mirrorFaceProfile']='anatomical-portrait-v2';body['mirrorPreviewOnly']=True;body['projectedFaceTexture']=False
    for obj in out:
        if obj.name.startswith('Eyes_'):
            for m in obj.data.materials:
                s=m.node_tree.nodes.get('Principled BSDF') if m and m.use_nodes else None
                if s:
                    s.inputs['Roughness'].default_value=.17 if 'White' in m.name else .22
                    s.inputs['Coat Weight'].default_value=.65;s.inputs['Coat Roughness'].default_value=.08
    surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[tuple(f.vertices) for f in body.data.polygons])
    def retire(obj):
        out.remove(obj);obj.hide_set(True);obj.hide_render=True;obj.name='PreviousPortrait_'+obj.name
    def make(name,verts,faces,mats,role='hair',indices=None,source=None):
        source=source or old_hair
        mesh=bpy.data.meshes.new(name+' fitted sculpt');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new(name,mesh);C.objects.link(obj);obj.parent=rig;obj['mirrorRole']=role
        for m in mats:mesh.materials.append(m)
        for f in mesh.polygons:f.use_smooth=True
        if indices:
            for f,i in zip(mesh.polygons,indices):f.material_index=i
        vg=obj.vertex_groups.new(name='head');vg.add(list(range(len(verts))),1,'REPLACE')
        arm=obj.modifiers.new('Shared head rig','ARMATURE');arm.object=rig
        kd=KDTree(len(source.data.vertices))
        for v in source.data.vertices:kd.insert(v.co,v.index)
        kd.balance();nearest=np.array([kd.find(v.co)[1] for v in mesh.vertices])
        base=np.array(verts,dtype=np.float32);source_base=np.array([v.co[:] for v in source.data.vertices],dtype=np.float32)
        obj.shape_key_add(name='Basis')
        for name in names:
            target=np.empty(len(source_base)*3,dtype=np.float32);source.data.shape_keys.key_blocks[name].data.foreach_get('co',target)
            delta=target.reshape((-1,3))[nearest]-source_base[nearest]
            key=obj.shape_key_add(name=name);key.data.foreach_set('co',(base+delta).ravel())
        out.append(obj);return obj
    def fit_head(p,minimum=.004,maximum=.015):
        d=(p-hair_center).normalized();hit,_,_,_=surface.ray_cast(hair_center,d,.3)
        if not hit:return p
        length=(hit-hair_center).length
        return hair_center+d*max(length+minimum,min(length+maximum,(p-hair_center).length))
    # Entirely new hair: filled scalp, variable-width waves, and small curled ends.
    for o in list(out):
        if o.name.startswith('Hair_swept'):retire(o)
    hair_mats=[material('Portrait_Chestnut_'+str(i),c,.69+i*.015) for i,c in enumerate([(.235,.15,.10),(.285,.185,.125),(.26,.17,.115),(.215,.135,.09)])]
    vs=[];fs=[];mi=[]
    hair_center=Vector((0,-.003,1.790))
    def scalp(theta,latitude,extra=.004):
        p=hair_center+Vector((.093*math.sin(latitude)*math.sin(theta),-.155*math.sin(latitude)*math.cos(theta),.100*math.cos(latitude)))
        return fit_head(p,extra,extra+.002)
    for row in range(27):
        for col in range(112):
            t=col*math.tau/112;front=(1+math.cos(t))/2;limit=2.20-.88*front+.05*math.sin(t*3-.5)
            p=scalp(t,.006+(limit-.006)*row/26)
            vs.append(tuple(p))
    for row in range(26):
        for col in range(112):
            a=row*112+col;b=row*112+(col+1)%112;fs.append((a,b,b+112,a+112));mi.append(0)
    fs.append(tuple((26*112+j) for j in reversed(range(112))));mi.append(0)
    rng=random.Random(311)
    def lock(points,width,depth,seed):
        points=[fit_head(Vector(p),.006,.024) for p in points];start=len(vs);rings=28;edges=12
        def curve(t):
            i=min(len(points)-2,int(t*(len(points)-1)));u=t*(len(points)-1)-i
            a,b,c,d=[points[max(0,min(len(points)-1,j))] for j in (i-1,i,i+1,i+2)]
            return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
        for i in range(rings):
            t=i/(rings-1);p=fit_head(curve(t),.006,.024);tangent=(curve(min(1,t+.003))-curve(max(0,t-.003))).normalized()
            normal=(p-hair_center).normalized();axis=tangent.cross(normal).normalized();normal=axis.cross(tangent).normalized()
            taper=(.40+.60*math.sin(math.pi*t)**.55)*(1-.985*t**5)
            for j in range(edges):
                angle=j*math.tau/edges;groove=1+.055*math.cos(angle*5+t*2+seed)
                point=p+axis*math.cos(angle)*width*taper+normal*math.sin(angle)*depth*taper*groove
                if math.sin(angle)<0:
                    base=fit_head(p+axis*math.cos(angle)*width*taper,.003,.003)
                    point=point.lerp(base,-math.sin(angle))
                vs.append(tuple(point))
        for i in range(rings-1):
            for j in range(edges):
                a=start+i*edges+j;b=start+i*edges+(j+1)%edges;fs.append((a,b,b+edges,a+edges));mi.append(1 if j in (1,2,3) else 2 if j==4 and seed%3==0 else 0 if j in (8,9) else 3)
        fs.append(tuple(start+j for j in reversed(range(edges))));mi.append(0)
        fs.append(tuple(start+(rings-1)*edges+j for j in range(edges)));mi.append(1)
    # Surface-guided, individually varied S waves: roots and tips stay fitted.
    def guide(points,width,depth,seed):
        lock([scalp(theta,latitude,extra) for theta,latitude,extra in points],width,depth,seed)
    for i in range(13):
        d=i*.026;j=rng.uniform(-.025,.025)
        guide([(1.0+d,1.08+d*.15,.006),(.55+d,.70+d*.15,.013),(-.05+d,.25+d*.55,.022),(-.65+d,.50+d*.65,.020),(-1.20+d,.90+d*.65,.012),(-1.38+d,.84+d*.70,.005)],.0062+rng.uniform(-.0007,.0007),.0045,10+i)
    for i in range(10):
        d=i*.042
        guide([(.65+d,1.20,.006),(.25+d*.6,.96,.016),(-.25+d*.3,1.12,.018),(-.62+d*.2,1.36,.010),(-.86+d*.15,1.27,.005)],.0052,.0039,40+i)
    guide([(.08,1.14,.007),(-.05,1.33,.013),(-.18,1.49,.009),(-.26,1.50,.004)],.0018,.0015,58)
    for i in range(10):
        d=i*.065
        guide([(.30+d,1.08,.006),(.13+d*.70,1.25,.013),(-.20+d*.60,1.43+(i%3)*.025,.010),(-.44+d*.55,1.40+(i%2)*.025,.004)],.0045,.0034,61+i)
    for i in range(9):
        d=i*.045
        guide([(.18+d,1.17,.006),(.70+d,.92,.017),(1.2+d,1.04,.016),(1.55+d,1.32,.007),(1.68+d,1.30,.004)],.0056,.004,70+i)
    for sign in (-1,1):
        for row in range(3):
            for col in range(7):
                theta=sign*(1.22+col*.30);lat=.80+row*.31
                guide([(theta-sign*.12,lat-.08,.004),(theta,lat,.010),(theta+sign*.18,lat+.15,.011),(theta+sign*.30,lat+.31,.004)],.0052,.0034,90+row*7+col)
        guide([(sign*1.35,1.25,.003),(sign*1.43,1.47,.005),(sign*1.49,1.65,.002)],.0034,.0024,130)
    for i in range(10):
        theta=1.85+i*.27
        guide([(theta,.42,.004),(theta+.17,.68,.012),(theta+.30,.91,.010),(theta+.40,1.19,.004)],.0060,.0038,140+i)
    # Blend overlapping lock bases into a continuous sculpt instead of floating tubes.
    raw_mesh=bpy.data.meshes.new('Hair sculpt union input');raw_mesh.from_pydata(vs,[],fs);raw_mesh.update()
    for m in hair_mats:raw_mesh.materials.append(m)
    for face,index in zip(raw_mesh.polygons,mi):face.material_index=index
    raw=bpy.data.objects.new('Hair sculpt union',raw_mesh);C.objects.link(raw)
    bpy.ops.object.select_all(action='DESELECT');raw.select_set(True);bpy.context.view_layer.objects.active=raw
    raw.data.remesh_voxel_size=.0012;bpy.ops.object.voxel_remesh()
    smooth=raw.modifiers.new('Polish sculpted waves','SMOOTH');smooth.factor=.45;smooth.iterations=3
    deps=bpy.context.evaluated_depsgraph_get();result=bpy.data.meshes.new_from_object(raw.evaluated_get(deps),depsgraph=deps)
    vv=[v.co[:] for v in result.vertices];ff=[tuple(f.vertices) for f in result.polygons]
    ids=[min(len(hair_mats)-1,f.material_index) for f in result.polygons]
    bpy.data.objects.remove(raw,do_unlink=True)
    hair=make('Hair_swept',vv,ff,hair_mats,'hair',ids,old_hair);hair['mirrorHairProfile']='portrait-layered-curls-v2'
    hair['continuousHairSculpt']=True

    # Fine brows follow the real forehead, with a tapered outer end.
    old_brow=next(o for o in out if o.name=='Eyebrows_sculpted');retire(old_brow)
    vs=[];fs=[];brow_mat=material('Portrait_Brow',(.28,.18,.11),.78)
    for side in (-1,1):
        start=len(vs)
        for i in range(65):
            t=i/64;x=side*(.014+.048*t);z=1.770+.004*math.sin(math.pi*t)-.006*t*t
            width=.0032*(1-.92*t**4)
            for j in range(6):
                a=j*math.tau/6;zz=z+width*math.cos(a)
                hit,_,_,_=surface.ray_cast(Vector((x,-.4,zz)),Vector((0,1,0)))
                yy=hit.y if hit else -.155
                vs.append((x,yy-.0007-.0010*math.sin(a),zz))
        for i in range(64):
            for j in range(6):
                a=start+i*6+j;b=start+i*6+(j+1)%6;fs.append((a,b,b+6,a+6))
    make('Eyebrows_sculpted',vs,fs,[brow_mat],'hair',None,old_brow)
    # Use the anatomically fitted licensed sneaker topology rather than pointed lofts.
    old_shoe=next(o for o in out if o.name=='Shoes');retire(old_shoe)
    with bpy.data.libraries.load(str(P/'assets/characters/mirror-sculpted.blend'),link=False) as (available,loaded):loaded.objects=['Shoes']
    shoes=loaded.objects[0]
    for c in list(shoes.users_collection):c.objects.unlink(shoes)
    C.objects.link(shoes);shoes.parent=rig;shoes.name='Shoes';shoes['mirrorRole']='shoes'
    for mod in shoes.modifiers:
        if mod.type=='ARMATURE':mod.object=rig
    shoes.hide_set(False);shoes.hide_render=False;out.append(shoes)
    rubber=material('Portrait_Sneaker_Cream',(.91,.88,.79),.86)
    shoes.data.materials.append(rubber);mi=len(shoes.data.materials)-1
    bottom=min(v.co.z for v in shoes.data.vertices)
    for face in shoes.data.polygons:
        if max(shoes.data.vertices[i].co.z for i in face.vertices)<bottom+.028:face.material_index=mi
    green=material('Portrait_Sneaker_Green',(.17,.29,.22),.75)
    shoe_surface=BVHTree.FromPolygons([v.co for v in shoes.data.vertices],[tuple(f.vertices) for f in shoes.data.polygons])
    for side,foot in [(1,'l'),(-1,'r')]:
        points=[v.co for v in shoes.data.vertices if v.co.x*side>0];front=min(p.y for p in points);back=max(p.y for p in points)
        vs=[]
        for t,z in [(.30,.064),(.47,.046),(.85,.083),(.69,.080),(.43,.064)]:
            yy=front+t*(back-front);hit,normal,_,_=shoe_surface.ray_cast(Vector((side,yy,bottom+z)),Vector((-side,0,0)))
            if hit:vs.append(tuple(hit+normal*.0007))
        if len(vs)==5:
            mesh=bpy.data.meshes.new('Sneaker side panel');mesh.from_pydata(vs,[],[tuple(range(5))]);mesh.materials.append(green)
            obj=bpy.data.objects.new('Portrait_Sneaker_Panel_'+foot,mesh);C.objects.link(obj);obj.parent=rig;obj['mirrorRole']='shoes'
            vg=obj.vertex_groups.new(name='foot_'+foot);vg.add(list(range(5)),1,'REPLACE');arm=obj.modifiers.new('Foot rig','ARMATURE');arm.object=rig
            obj.shape_key_add(name='Basis')
            for key in names:obj.shape_key_add(name=key)
            out.append(obj)
    refine_eyes(out,rig)
    rig['mirrorPreviewOnly']=True;rig['portraitVersion']=2;rig['portraitExportObjects']=[o.name for o in out]
    for o in out:
        hidden=(o.name.startswith('Hair_') and o.name!='Hair_swept') or (o.name.startswith('Outfit_') and o.name!='Outfit_reference')
        o.hide_set(hidden);o.hide_render=hidden
    for o in bpy.data.objects:
        if o.type=='MESH' and o not in out:o.hide_render=True
    def aim(bone_name,child_name,direction):
        b=rig.pose.bones[bone_name];child=rig.pose.bones[child_name];origin=b.head.copy()
        delta=(child.head-origin).normalized().rotation_difference(Vector(direction).normalized())
        b.matrix=Matrix.Translation(origin)@delta.to_matrix().to_4x4()@Matrix.Translation(-origin)@b.matrix;bpy.context.view_layer.update()
    for side,sign in [('l',1),('r',-1)]:
        aim('upperarm_'+side,'lowerarm_'+side,(sign*.28,.025,-1));aim('lowerarm_'+side,'hand_'+side,(sign*.06,-.10,-1))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.world.color=(.30,.30,.30);scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    for name,loc,power,size in [('Portrait Key',(-3,-4,5),230,4),('Portrait Fill',(3,-2,3),115,3),('Portrait Rim',(1,3,4),200,3),('Eye softbox',(-1.0,-3,2.4),30,1.2)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,1.5))-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Portrait review camera');camera=bpy.data.objects.new('Portrait review camera',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO'
    scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
    for name,loc,point,scale in [('face',(0,-5,1.755),(0,0,1.755),.37),('quarter',(2.2,-5,1.755),(0,0,1.755),.37),('body',(0,-5,1.0),(0,0,1.0),2.08)]:
        camera.location=loc;camera.rotation_euler=(Vector(point)-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale
        scene.render.filepath='/private/tmp/h2h-portrait-v2-'+name+'.png';bpy.ops.render.render(write_still=True)
    bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(target))
    print('PORTRAIT_V2_SOURCE',len(out),'parts',flush=True)
if '--repair-eyes' in sys.argv:
    # Restore original corneal depth before the small, fitted iris enlargement.
    C=bpy.data.collections['Mirror export']
    def sculpt_original(points):
        p=np.array(points,dtype=float);x,y,z=p.T.copy();a=abs(x);front=np.clip((-y-.03)/.10,0,1)
        cheek=np.exp(-((a-.046)/.032)**2)*np.exp(-((z-1.718)/.036)**2)*front
        x*=1-.025*np.exp(-((z-1.67)/.063)**2)*front
        x*=1+.08*np.exp(-((z-1.650)/.025)**2)*front
        y-=.0015*cheek
        eye=np.exp(-((a-.032)/.027)**2)*np.exp(-((z-1.749)/.027)**2)*front
        z+=(z-1.749)*.11*eye
        z-=.014*np.exp(-((z-1.650)/.024)**2)*front
        z-=.003*np.exp(-((z-1.691)/.018)**2)*front
        z+=.003*np.exp(-((z-1.780)/.022)**2)*front
        nose=np.exp(-(x/.019)**2)*np.exp(-((z-1.718)/.021)**2)*front;y+=.0015*nose
        return np.column_stack((x,y,z)).astype(np.float32)
    for side in (-1,1):
        name='Eyes_Iris_'+str(side);bad=next(o for o in out if o.name==name);out.remove(bad);bad.name='RetiredIris_'+str(side);bad.hide_set(True);bad.hide_render=True
        with bpy.data.libraries.load(str(P/'assets/characters/blender-reference.blend'),link=False) as (available,loaded):loaded.objects=[name]
        eye=loaded.objects[0]
        for c in list(eye.users_collection):c.objects.unlink(eye)
        C.objects.link(eye);eye.name=name;eye.parent=rig
        for mod in eye.modifiers:
            if mod.type=='ARMATURE':mod.object=rig
        for key in eye.data.shape_keys.key_blocks:
            co=np.array([v.co[:] for v in key.data]);key.data.foreach_set('co',sculpt_original(co).ravel())
        basis=eye.data.shape_keys.key_blocks[0];values=np.empty(len(basis.data)*3,dtype=np.float32);basis.data.foreach_get('co',values);eye.data.vertices.foreach_set('co',values)
        for m in eye.data.materials:
            if not m or not m.use_nodes:continue
            sh=m.node_tree.nodes.get('Principled BSDF')
            if sh:sh.inputs['Coat Weight'].default_value=.65;sh.inputs['Coat Roughness'].default_value=.08;sh.inputs['Roughness'].default_value=.22
        eye.hide_set(False);eye.hide_render=False;out.append(eye)
    rig['portraitEyeRefinement']=False
if '--refine-eyes' in sys.argv or '--repair-eyes' in sys.argv:
    refine_eyes(out,rig)
    rig['portraitExportObjects']=[o.name for o in out]
    scene=bpy.context.scene;camera=scene.camera;data=camera.data
    for name,loc,point,scale in [('face',(0,-5,1.755),(0,0,1.755),.37),('quarter',(2.2,-5,1.755),(0,0,1.755),.37),('body',(0,-5,1.0),(0,0,1.0),2.08)]:
        camera.location=loc;camera.rotation_euler=(Vector(point)-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale
        scene.render.filepath='/private/tmp/h2h-portrait-v2-'+name+'.png';bpy.ops.render.render(write_still=True)
    bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(target))
if '--draft' not in sys.argv:
    # Keep the detailed Blender sculpt; export a lighter fitted game copy.
    source_hair=next(o for o in out if o.name=='Hair_swept')
    source_hair.hide_set(False)
    modifier=source_hair.modifiers.new('Game hair surface reduction','DECIMATE');modifier.ratio=.35
    deps=bpy.context.evaluated_depsgraph_get();bpy.context.view_layer.update()
    mesh=bpy.data.meshes.new_from_object(source_hair.evaluated_get(deps),depsgraph=deps)
    game_hair=bpy.data.objects.new('Game_Hair',mesh);source_hair.users_collection[0].objects.link(game_hair);game_hair.parent=rig
    for key in source_hair.keys():game_hair[key]=source_hair[key]
    game_hair['gameSurfaceReduced']=True
    kd=KDTree(len(source_hair.data.vertices))
    for v in source_hair.data.vertices:kd.insert(v.co,v.index)
    kd.balance();near=np.array([kd.find(v.co)[1] for v in mesh.vertices])
    original=np.array([v.co[:] for v in source_hair.data.vertices],dtype=np.float32)
    base=np.array([v.co[:] for v in mesh.vertices],dtype=np.float32)
    vg=game_hair.vertex_groups.new(name='head');vg.add(list(range(len(mesh.vertices))),1,'REPLACE')
    arm=game_hair.modifiers.new('Head skeleton','ARMATURE');arm.object=rig
    game_hair.shape_key_add(name='Basis')
    for name in source_hair.data.shape_keys.key_blocks.keys():
        if name=='Basis':continue
        co=np.empty(len(original)*3,dtype=np.float32);source_hair.data.shape_keys.key_blocks[name].data.foreach_get('co',co)
        delta=co.reshape((-1,3))[near]-original[near];delta[np.abs(delta)<1e-6]=0
        key=game_hair.shape_key_add(name=name);key.data.foreach_set('co',(base+delta).ravel())
    for face in mesh.polygons:face.use_smooth=True
    out=[game_hair if o==source_hair else o for o in out];source_hair.name='PortraitHighResolutionHair';source_hair.hide_set(True);source_hair.hide_render=True;game_hair.name='Hair_swept'
    print('GAME_HAIR_VERTICES',len(mesh.vertices),flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in out+[rig]:obj.hide_set(False);obj.hide_render=False;obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(P/'public/game3d/blender-reference-v2.glb'),export_format='GLB',use_selection=True,export_morph=True,export_morph_normal=False,export_skins=True,export_animations=False,export_extras=True,export_try_sparse_sk=True,export_try_omit_sparse_sk=True,
        export_copyright='H2H anatomical portrait sculpt, local Blender modeling; MakeHuman CC0 base topology/rig/clothes; shirt artwork supplied by user.')
    print('PORTRAIT_V2_EXPORT',flush=True)
