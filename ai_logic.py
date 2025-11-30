# ai_logic.py
import feedparser #reads feeds like google news feeds
import requests # downloads web pages
from bs4 import BeautifulSoup #extract text from HTML pages
from textblob import TextBlob #text analysis library
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer #rule-based sentiment analyzer
from datetime import datetime #handles timestamps
from urllib.parse import quote #handles urls
from transformers import AutoTokenizer, AutoModelForSequenceClassification #pretrained neural network model for classifying text sequences
import torch
import numpy as np
#last 3 above are useful for using finbert trained model 

model = AutoModelForSequenceClassification.from_pretrained("yiyanghkust/finbert-tone")
tokenizer = AutoTokenizer.from_pretrained("yiyanghkust/finbert-tone")

def fetch_news(query, num_articles=10):
    rss_url = f"https://news.google.com/rss/search?q={quote(query)}" #RSS URL gets latest articles
    feed = feedparser.parse(rss_url) 
    news_items = feed.entries[:num_articles] #returns first 10 news stories

    articles = []
    for item in news_items:
        title = item.title
        link = item.link
        published = item.published
        content = fetch_article_content(link) #downloads the full article text
        
        articles.append({
            "title": title,
            "link": link,
            "published": published,
            "content": content
        })

    return articles

def fetch_article_content(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status() #check response status
        soup = BeautifulSoup(response.text, 'html.parser')

        paragraphs = soup.find_all('p')
        content = ' '.join([p.get_text() for p in paragraphs])
        return content.strip()
    except requests.RequestException:
        return "Content not retrieved."

def analyze_sentiment(text):

    analyzer = SentimentIntensityAnalyzer()
    scores = analyzer.polarity_scores(text)
    polarity = scores['compound']

    # analysis = TextBlob(text)
    # polarity = analysis.sentiment.polarity

    if polarity > 0.05:
        sentiment = 'Positive'
    elif polarity < -0.05:
        sentiment = 'Negative'
    else:
        sentiment = 'Neutral'

    return polarity, sentiment


def summarize_sentiments(articles):
    summary = {
        "Positive": 0,
        "Negative": 0,
        "Neutral": 0
    }

    for article in articles:
        _, sentiment = analyze_sentiment(article['title']) #counts how many articles were positive/negative/neutral based on titles
        summary[sentiment] += 1

    return summary


def analyze_query(query, num_articles=10):

    articles = fetch_news(query, num_articles)

    # add sentiment for each article
    for article in articles:
        polarity, sentiment = analyze_sentiment(article["title"])
        article["polarity"] = polarity
        article["sentiment"] = sentiment

    summary_counts = summarize_sentiments(articles)
    total = len(articles) or 1

    summary_percent = {
        k: {
            "count": v,
            "percent": (v / total) * 100
        }
        for k, v in summary_counts.items()
    }

    return {
        "query": query,
        "total_articles": len(articles),
        "summary": summary_percent,
        "articles": articles,
    }

