"""Pair a LAUNCH-only TV recovery client; requires TV-remote consent."""
import argparse
from tv_recovery import connect, launch, PAIRING

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--execute", action="store_true")
args = parser.parse_args()
if not args.execute:
    print("No TV connection. --execute requests a LAUNCH-only pairing prompt.")
else:
    print("Accept the Reframe recovery permission prompt on the TV.", flush=True)
    tv = connect(pair=True)
    tv.close()
    print("Recovery pairing saved privately:", PAIRING.name, flush=True)
    print("Reframe launch via independent TV-control route:", launch("com.reframe.home"), flush=True)
