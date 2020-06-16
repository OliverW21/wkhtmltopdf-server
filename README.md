**This is Heavily based on [https://hub.docker.com/r/insightsoftware/wkhtmltopdf](https://hub.docker.com/r/insightsoftware/wkhtmltopdf)**

wkhtmltopdf-server
=================
Turn wkhtmltopdf into an Api.

Accepts Json in this format:
```json
{
	"header": "Base64 encoded HTML",
	"body": "Base64 encoded HTML",
	"footer": "Base64 encoded HTML",
	"options": []
}
```

