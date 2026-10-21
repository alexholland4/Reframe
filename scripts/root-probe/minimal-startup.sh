#!/bin/sh
# Reframe's minimal HBC callback. Never invoke the stock HBC startup here.
exec /usr/bin/node /var/lib/reframe/startup.cjs
