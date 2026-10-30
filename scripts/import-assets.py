"""One-time migration: python3 scripts/import-assets.py /absolute/source/repo.
Requires ffmpeg/ffprobe only when preparing legacy video. Build/start never uses them.
"""
import json,sys,pathlib,shutil,hashlib,subprocess,re
root=pathlib.Path(__file__).resolve().parents[1];source=pathlib.Path(sys.argv[1]).resolve();public=root/'public'
data=json.loads((source/'portfolio/planning/data/portfolio.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def copy(src,dst):
 dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
 assert sha(src)==sha(dst),str(src)
 return '/'+str(dst.relative_to(public))
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
assets=[];ledger=[]
for a in data['assets']:
 included=a['status']=='included' and not a['duplicateOf'] and a['type']!='zip' and bool(a.get('project'))
 entry=dict(a);entry['imported']=included;ledger.append(entry)
 if not included:continue
 src=source/a['path'];assert sha(src)==a['sha256'],str(src)
 kind='videos' if a['type'] in ['mov','flv','mp4'] else 'documents' if a['type']=='pdf' else 'images'
 original=copy(src,public/'media/originals'/kind/(a['id']+'.'+a['type']))
 display=original
 if a['type'] in ['mov','flv']:
  out=public/'media/videos'/(a['id']+'.mp4');out.parent.mkdir(parents=True,exist_ok=True)
  if not out.exists():
   codec=['-c:v','libx264','-preset','fast','-crf','21','-vf',"scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-pix_fmt','yuv420p'] if a.get('codec')=='hevc' else ['-c:v','copy']
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-map','0:v:0','-map','0:a?']+codec+['-c:a','aac','-b:a','160k','-movflags','+faststart',str(out)],check=True)
  display='/'+str(out.relative_to(public));entry['video']=probe(out)
 preview=copy(source/'portfolio/planning'/a['preview'],public/'media/previews'/(a['id']+pathlib.Path(a['preview']).suffix)) if a.get('preview') else None
 assets.append({k:a[k] for k in ['id','type','width','height','chapter','project'] if k in a}|{'src':display,'original':original,'preview':preview})
 entry['original']=original;entry['display']=display
 print(a['id'],flush=True)
projects=[]
ids={a['id'] for a in assets}
for p in data['projects']:
 p={k:v for k,v in p.items() if k not in ['source']};p['assets']=[a for a in p['assets'] if a in ids]
 cover=source/'portfolio/planning/previews/covers'/(p['id']+'.webp')
 p['coverSrc']=copy(cover,public/'media/covers'/cover.name) if cover.exists() else None
 projects.append(p)
(public/'data').mkdir(exist_ok=True)
(public/'data/portfolio.json').write_text(json.dumps({'projects':projects,'assets':assets},ensure_ascii=False,indent=2))
(root/'design/source-ledger.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2))
resume=(source/'曹一聪_个人简历.html').read_text()
# Copy every local Gallery/assets dependency, including the lightbox originals.
for rel in sorted(set(re.findall(r'(?:Gallery|assets)/[^\"\'<>]+',resume))):
 if (source/rel).is_file():
  new=copy(source/rel,public/'resume/resources'/rel)
  resume=resume.replace(rel,new)
(public/'resume/index.html').write_text(resume)
print('Imported',len(projects),'projects',len(assets),'assets')
