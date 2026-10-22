"""Build a small playlist from selected public US channel IDs; --execute uploads it."""
import argparse
import json
import re
import time
import urllib.request
from tv_connection import PROJECT
from tv_inspector import evaluate
from iptv_setup import request,APP

URL="https://iptv-org.github.io/iptv/countries/us.m3u"


def prepare():
    profile=json.loads((PROJECT/"docs/iptv-trial-channels.json").read_text(encoding="utf-8"))
    with urllib.request.urlopen(URL,timeout=20) as response:
        data=response.read(4_000_001)
    if len(data)>4_000_000:raise ValueError("US playlist exceeds expected size")
    catalog={};info=""
    for line in data.decode("utf-8").splitlines():
        if line.startswith("#EXTINF:"):info=line
        elif line.startswith(("http://","https://")):
            match=re.search(r'tvg-id="([^"\r\n]+)"',info)
            if match:catalog.setdefault(match.group(1),line)
    lines=["#EXTM3U"]
    for item in profile:
        if any(not isinstance(item.get(key),str) or not item[key] or any(c in item[key] for c in '\r\n"') for key in ["id","label","group"]):
            raise ValueError("Invalid channel profile")
        url=catalog.get(item["id"])
        if not url:raise ValueError("Channel ID missing from current US playlist: "+item["id"])
        lines.extend(['#EXTINF:-1 tvg-id="'+item["id"]+'" group-title="'+item["group"]+'",'+item["label"],url])
    output=PROJECT/".research/iptv-trial/trial.m3u"
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text("\n".join(lines)+"\n",encoding="utf-8",newline="\n")
    return output,profile


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute",action="store_true")
    args=parser.parse_args()
    output,profile=prepare()
    if not args.execute:
        print("Prepared",len(profile),"channels at",output,"without TV access")
        return
    print("Uploaded:",request("/uploads","POST",output.read_text(encoding="utf-8")),flush=True)
    source=evaluate(APP,"JSON.parse(localStorage.getItem('iptv_playlists')||'[]').find(p=>p.source==='upload'&&p.name==='Reframe trial')?.id")
    if not source:raise RuntimeError("Uploaded source not registered yet; inspect the app before retrying")
    # Same-name/count uploads can leave the app's parsed cache unchanged.
    # Source-enable changes use the player's own cache invalidation/reload path.
    for enabled in [False,True]:
        action=request("/setup-actions","POST",{"type":"set-source-enabled","sourceId":source,"enabled":enabled})
        for _ in range(6):
            if not request("/setup-actions/"+str(action["id"]))["pending"]:break
            time.sleep(.5)
        else:raise RuntimeError("Source refresh not acknowledged")
    expected=[item["label"] for item in profile]
    for _ in range(8):
        if evaluate(APP,"[...document.querySelectorAll('.channel-item .channel-name')].map(e=>e.textContent)")==expected:
            print("TV list verified:",expected,flush=True)
            return
        time.sleep(.5)
    raise RuntimeError("Updated channel list not observed")


if __name__=="__main__":main()
