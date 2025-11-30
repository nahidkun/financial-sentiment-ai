import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Brain,
  Zap,
  ExternalLink,
} from "lucide-react";
import stockChart from "@/assets/stock-chart.jpg";
import forexChart from "@/assets/forex-chart.jpg";
import financialGraphs from "@/assets/financial-graphs.jpg";

type SentimentType = "positive" | "negative" | "neutral" | null;

interface AnalysisResult {
  headline: string;
  sentiment: SentimentType;
  timestamp: Date;
  explanation: string;
  link?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

const Index = () => {
  const [headline, setHeadline] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "time" | "sentiment">("time");
  const [filterBy, setFilterBy] = useState<SentimentType | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    positive: number;
    negative: number;
    neutral: number;
  } | null>(null);

  const analyzeHeadline = async () => {
    const query = headline.trim();
    if (!query) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Backend error:", text);
        setErrorMsg("Backend returned an error. Check the Flask console.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      const articles = (data.articles || []) as any[];

      const mapped: AnalysisResult[] = articles.map((a) => {
        const sentiment = (a.sentiment || "neutral") as SentimentType;
        const ts = a.published ? new Date(a.published) : new Date();

        const explanation =
          a.explanation ||
          `Polarity score: ${
            typeof a.polarity === "number"
              ? a.polarity.toFixed(3)
              : String(a.polarity ?? "")
          }`;

        return {
          headline: a.title,
          sentiment,
          timestamp: ts,
          explanation,
          link: a.link,
        };
      });

      setResults(mapped);
      if (data.summary) {
        setSummary({
          positive: data.summary.positive ?? 0,
          negative: data.summary.negative ?? 0,
          neutral: data.summary.neutral ?? 0,
        });
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "Could not reach the backend. Is python app.py running on port 5000?"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setSummary(null);
    setErrorMsg(null);
  };

  const exportResults = () => {
    if (!results.length) return;

    const csv = [
      ["Headline", "Sentiment", "Date", "Time", "Link", "Explanation"],
      ...results.map((r) => [
        `"${r.headline.replace(/"/g, '""')}"`,
        r.sentiment || "",
        r.timestamp.toLocaleDateString(),
        r.timestamp.toLocaleTimeString(),
        r.link || "",
        `"${r.explanation.replace(/"/g, '""')}"`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sentiment-analysis-results.csv";
    a.click();
  };

  const getSentimentIcon = (sentiment: SentimentType) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="w-5 h-5" />;
      case "negative":
        return <TrendingDown className="w-5 h-5" />;
      case "neutral":
        return <Minus className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getSentimentColor = (sentiment: SentimentType) => {
    switch (sentiment) {
      case "positive":
        return "positive";
      case "negative":
        return "negative";
      case "neutral":
        return "neutral";
      default:
        return "muted";
    }
  };

  const filteredResults = results.filter(
    (r) => filterBy === "all" || r.sentiment === filterBy
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "date" || sortBy === "time") {
      return b.timestamp.getTime() - a.timestamp.getTime();
    }
    if (sortBy === "sentiment") {
      const order: Record<NonNullable<SentimentType>, number> = {
        positive: 3,
        neutral: 2,
        negative: 1,
      };
      return (
        (order[b.sentiment || "neutral"] || 0) -
        (order[a.sentiment || "neutral"] || 0)
      );
    }
    return 0;
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="absolute inset-0 opacity-10">
          <img src={stockChart} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto max-w-4xl relative">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-extrabold text-primary-foreground mb-4 tracking-tight">
              Financial News Sentiment Analyzer
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 font-medium">
              Analyze financial news headlines instantly with AI-powered sentiment detection
            </p>
          </div>

          <Card className="p-8 shadow-glow border-2 backdrop-blur-sm bg-background/95 animate-scale-in">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 flex-col sm:flex-row">
                <Input
                  placeholder="Enter financial news headline (e.g., 'Tesla stock crashes 15%')"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && analyzeHeadline()}
                  className="flex-1 h-14 text-lg border-2 focus-visible:ring-primary"
                />
                <Button
                  onClick={analyzeHeadline}
                  size="lg"
                  disabled={isLoading}
                  className="h-14 px-8 bg-primary hover:bg-primary-dark text-primary-foreground font-bold text-lg shadow-md hover:shadow-lg transition-smooth hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Analyze Sentiment
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Try full headlines like: &quot;Gold prices surge after Fed cuts rates&quot; or
                &quot;Stocks crash amid recession fears&quot;
              </p>
              {errorMsg && (
                <p className="text-sm text-red-500 text-center mt-2">
                  {errorMsg}
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Results Section */}
      {results.length > 0 && (
        <section className="py-16 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-6xl">
            {/* Filters & Sort */}
            <Card className="p-6 mb-8 shadow-md border-2">
              <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Filter:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "positive", "negative", "neutral"] as const).map((filter) => (
                      <Button
                        key={filter}
                        onClick={() => setFilterBy(filter)}
                        variant={filterBy === filter ? "default" : "outline"}
                        size="sm"
                        className="transition-smooth capitalize"
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Sort by:</span>
                  </div>
                  <div className="flex gap-2">
                    {(["date", "time", "sentiment"] as const).map((sort) => (
                      <Button
                        key={sort}
                        onClick={() => setSortBy(sort)}
                        variant={sortBy === sort ? "default" : "outline"}
                        size="sm"
                        className="transition-smooth capitalize"
                      >
                        {sort}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Results Grid */}
            <div className="grid gap-6 mb-8">
              {sortedResults.map((result, idx) => (
                <Card
                  key={idx}
                  className="p-6 hover:shadow-lg transition-smooth border-l-4 animate-fade-in"
                  style={{
                    // @ts-ignore: using CSS var
                    borderLeftColor: `hsl(var(--${getSentimentColor(result.sentiment)}))`,
                    animationDelay: `${idx * 0.1}s`,
                  }}
                >
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <Badge
                          className={`mt-1 px-3 py-1 font-bold text-sm bg-${getSentimentColor(
                            result.sentiment
                          )} text-${getSentimentColor(result.sentiment)}-foreground`}
                        >
                          <span className="flex items-center gap-1">
                            {getSentimentIcon(result.sentiment)}
                            {result.sentiment?.toUpperCase()}
                          </span>
                        </Badge>
                        <h3 className="text-lg font-semibold text-foreground flex-1">
                          {result.headline}
                        </h3>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        {result.explanation}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>📅 {result.timestamp.toLocaleDateString()}</span>
                        <span>🕐 {result.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={exportResults}
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-md hover:shadow-lg transition-smooth hover:scale-105"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Results (CSV)
              </Button>
              <Button
                onClick={clearResults}
                variant="outline"
                size="lg"
                className="font-bold border-2 hover:bg-destructive hover:text-destructive-foreground transition-smooth"
              >
                Clear All Results
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* About the System */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Rule-based sentiment analysis for financial news
            </p>
          </div>

          {/* Financial Images Showcase */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="p-4 overflow-hidden hover:shadow-lg transition-smooth">
              <img
                src={forexChart}
                alt="Foreign Exchange Trading Dashboard"
                className="w-full h-48 object-cover rounded-lg"
              />
              <p className="text-center mt-3 font-semibold text-foreground">
                Forex Market Analysis
              </p>
            </Card>
            <Card className="p-4 overflow-hidden hover:shadow-lg transition-smooth">
              <img
                src={financialGraphs}
                alt="Financial Data Visualization"
                className="w-full h-48 object-cover rounded-lg"
              />
              <p className="text-center mt-3 font-semibold text-foreground">
                Market Statistics
              </p>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Text Normalization",
                description:
                  "Converts to lowercase and strips punctuation while preserving financial symbols ($, %, Q2, EPS)",
              },
              {
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Abbreviation Handling",
                description:
                  "Recognizes and processes common financial abbreviations and terminology",
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Phrase Pattern Analysis",
                description:
                  "Analyzes sentence structure and phrase patterns for contextual sentiment",
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "Domain-Specific Lexicon",
                description:
                  "Uses financial market vocabulary for accurate sentiment classification",
              },
              {
                icon: <Search className="w-8 h-8" />,
                title: "Rule-Based Engine",
                description:
                  "Applies predefined linguistic rules for consistent sentiment detection",
              },
              {
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Clear Output",
                description:
                  "Generates simple, actionable sentiment classifications with explanations",
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                className="p-6 hover:shadow-lg transition-smooth hover:scale-105 border-2 bg-card"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          <Card className="p-8 bg-gradient-to-br from-primary/10 to-accent/10 border-2">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-foreground">
                COMP 415 – Artificial Intelligence
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                A university project demonstrating rule-based sentiment analysis for financial news
                headlines
              </p>
              <div className="mb-6">
                <img
                  src={stockChart}
                  alt="Stock Market Analysis"
                  className="w-full max-w-3xl mx-auto rounded-lg shadow-md h-48 object-cover"
                />
              </div>
              <div className="flex flex-wrap gap-4 justify-center">
                <Badge className="px-4 py-2 text-base bg-primary text-primary-foreground">
                  Natural Language Processing
                </Badge>
                <Badge className="px-4 py-2 text-base bg-accent text-accent-foreground">
                  Sentiment Analysis
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              Team Members
            </h2>
            <p className="text-xl text-muted-foreground">
              Built with dedication by our AI research team
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: "Nahid Lalá Daúde", role: "Project Leader & Backend dev" },
              { name: "Allan Cassamo Momade", role: "Frontend Developer" },
              { name: "Oluwatobi Stephan Olabode", role: "Data Analyst" },
              { name: "Bezawit Yyehuala Desta", role: "System Tester" },
              { name: "Kuyeri Chakupadedza Olabode", role: "System Designer" },
            ].map((member, idx) => (
              <Card
                key={idx}
                className="p-8 text-center hover:shadow-lg transition-smooth hover:scale-105 border-2"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white">
                  {member.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {member.name}
                </h3>
                <p className="text-muted-foreground">{member.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-lg font-semibold mb-2">
            Financial News Sentiment Analyzer
          </p>
          <p className="text-primary-foreground/80">
            © 2025 University AI Project • COMP 415 Artificial Intelligence
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
