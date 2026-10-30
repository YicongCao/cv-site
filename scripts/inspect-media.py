"""Optional exhaustive decode/probe audit; requires Pillow and ffprobe, not used by build."""
import pathlib,json,subprocess
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1];data=json.loads((root/'public/data/portfolio.json').read_text());report={'images':0,'videos':[],'pdf':[]}
for p in (root/'public').rglob('*'):
 if p.suffix.lower() in ['.jpg','.jpeg','.png','.webp','.gif']:
  with Image.open(p) as im:im.load()
  report['images']+=1
for a in data['assets']:
 p=root/'public'/a['src'].lstrip('/')
 if a['type'] in ['mov','mp4','flv']:
  info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]));v=next(s for s in info['streams'] if s['codec_type']=='video');assert v['codec_name']=='h264'
  if a['type']=='mov' and a['src']!=a['original'] and next(l for l in json.loads((root/'design/source-ledger.json').read_text()) if l['id']==a['id']).get('codec')=='hevc':assert max(v['width'],v['height'])<=1920
  report['videos'].append({'id':a['id'],'codec':v['codec_name'],'width':v['width'],'height':v['height'],'seconds':float(info['format']['duration'])})
 if a['type']=='pdf':
  assert p.read_bytes().startswith(b'%PDF-');report['pdf'].append(a['id'])
(root/'evidence/media-audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
