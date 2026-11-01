# RailScan UT Local Deployment

The production application is independent of the online preview service. It can run on a Windows or Linux computer inside the local network.

## Start the local server

Install Node.js 20 or newer, then run:

```bash
npm install
npm run build
npm run local
```

Open `http://localhost:8080` on the server computer.

The terminal also displays the LAN address, for example `http://192.168.1.20:8080`. Other computers on the same network can use that address if the operating system firewall permits TCP port 8080.

## Use a custom local link

To use `http://railscan.local:8080`, map the server address to that name on each client computer.

Windows hosts file:

```text
C:\Windows\System32\drivers\etc\hosts
```

Linux hosts file:

```text
/etc/hosts
```

Add this line, replacing the address with the local server IP:

```text
192.168.1.20 railscan.local
```

For a network-wide hostname, create the same `railscan.local` record in the router or internal DNS server instead of editing every computer.

## Change the port

Linux or macOS:

```bash
PORT=8090 npm run local
```

Windows PowerShell:

```powershell
$env:PORT=8090; npm run local
```

## Production recommendations

- Reserve a fixed LAN IP for the RailScan server.
- Allow only the required local subnet through the firewall.
- Use an internal DNS record such as `railscan.company.local`.
- Put Nginx or IIS in front of this server if HTTPS, port 80, access logs, or Windows service operation is required.
- Keep instrument API access on the trusted inspection network.