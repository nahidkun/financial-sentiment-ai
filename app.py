from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_logic import analyze_query  # your logic file

app = Flask(__name__)

# allow requests from frontend (localhost:5173)
CORS(app)  # by default: origins="*"

@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json() or {}
    query = data.get("query", "gold market")
    num_articles = int(data.get("num_articles", 10))

    try:
        result = analyze_query(query, num_articles)
        return jsonify(result)
    except Exception as e:
        print("ERROR in /api/analyze:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)

