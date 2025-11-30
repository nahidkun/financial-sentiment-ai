from flask import Flask, request, jsonify
from flask_cors import CORS
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
import os

app = Flask(__name__)
CORS(app)  # allow frontend localhost + vercel

analyzer = SentimentIntensityAnalyzer()


def fetch_article_content(url: str) -> str:
    """Fetch full article text (optional)."""
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        paragraphs = soup.find_all("p")
        content = " ".join(p.get_text(strip=True) for p in paragraphs)
        return content.strip() or "Content not retrieved."
    except Exception:
        return "Content not retrieved."


def fetch_news(query: str, num_articles: int = 10):
    """Fetch Google News RSS."""
    rss_url = f"https://news.google.com/rss/search?q={quote(query)}"
    feed = feedparser.parse(rss_url)
    entries = feed.entries[:num_articles]

    articles = []
    for item in entries:
        title = getattr(item, "title", "")
        link = getattr(item, "link", "")
        published = getattr(item, "published", "")

        content = title  # Keep analysis fast. Change to fetch_article_content(link) if needed.

        articles.append(
            {
                "title": title,
                "link": link,
                "published": published,
                "content": content,
            }
        )
    return articles


def analyze_sentiment(text: str):
    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]

    if compound > 0.05:
        sentiment = "positive"
    elif compound < -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    explanation = (
        f"VADER → compound={compound:.3f}, "
        f"pos={scores['pos']:.3f}, neu={scores['neu']:.3f}, neg={scores['neg']:.3f}"
    )

    return sentiment, compound, explanation


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json(silent=True) or {}
    query = (data.get("query") or "").strip()
    num_articles = int(data.get("limit") or 10)

    if not query:
        return jsonify({"error": "Missing query"}), 400

    articles = fetch_news(query, num_articles)
    results = []
    summary = {"positive": 0, "negative": 0, "neutral": 0}

    for art in articles:
        sentiment, compound, explanation = analyze_sentiment(art["title"])
        summary[sentiment] += 1

        results.append(
            {
                "title": art["title"],
                "link": art["link"],
                "published": art["published"],
                "sentiment": sentiment,
                "polarity": compound,
                "explanation": explanation,
            }
        )

    return jsonify(
        {
            "query": query,
            "total": len(results),
            "summary": summary,
            "articles": results,
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
