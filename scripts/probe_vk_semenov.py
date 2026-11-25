import json, os, urllib.parse, urllib.request, urllib.error
token=os.environ.get("VK_TOKEN","").strip()
if not token: raise SystemExit("Missing VK_TOKEN")
params={"domain":"708608893","count":1,"filter":"owner","v":"5.199","access_token":token}
req=urllib.request.Request("https://api.vk.ru/method/wall.get",data=urllib.parse.urlencode(params).encode(),method="POST")
try:
    with urllib.request.urlopen(req,timeout=20) as res: payload=json.load(res)
except urllib.error.HTTPError as e: raise SystemExit("HTTP "+str(e.code)) from None
except (OSError,ValueError): raise SystemExit("Network or response failure") from None
error=payload.get("error")
if isinstance(error,dict):
    result={"result":"error","code":error.get("error_code")}
else:
    data=payload.get("response")
    items=data.get("items") if isinstance(data,dict) else None
    if isinstance(items,list) and all(isinstance(x,dict) and x.get("owner_id")==708608893 for x in items):
        result={"result":"wall_read_ok","count":len(items)}
    else: result={"result":"unexpected_or_mismatched_response"}
print("SEMENOV_PROBE "+json.dumps(result))
