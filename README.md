# ShujaaPay Web Monetization & Paywall JS

A simple, zero-dependency JavaScript widget that allows content creators and web platforms to lock premium content (videos, articles, downloads, or custom page elements) and unlock them instantly via micropayments (M-Pesa STK Push or Stablecoins).

## Quick Start (CDN / Direct Embed)

Include the script directly on your HTML page. Specify the data attributes to target the content you want to monetize:

```html
<script 
  src="https://shujaapay.me/shujaapay-monetize.js" 
  data-slug="premium-video-tutorial-001" 
  data-time="15" 
  data-amount="50.00" 
  data-title="Unlock Full Tutorial Video" 
  data-type="video" 
  data-target="#tutorial-video-player"
  data-required="true">
</script>
```

### Attributes

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `data-slug` | String | Unique slug ID identifying this locked asset or paywall session. |
| `data-time` | Number | The free preview time (in seconds) allowed before the overlay locks (only applicable for `video`/`audio` content). |
| `data-amount` | Number | The micropayment fee to unlock the content (defaults to KES equivalent). |
| `data-title` | String | Custom heading displayed inside the paywall modal overlay. |
| `data-type` | String | The content category being locked: `video`, `audio`, `page`, `element`, `live`, or `download`. |
| `data-target` | String | CSS selector targeting the DOM element to lock (e.g. `#my-video` or `.premium-article`). |

---

## License
MIT
