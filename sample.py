from flask import Flask, render_template, jsonify, request
import webbrowser

app = Flask(__name__)

@app.route("/", methods= ['GET'])
def return_html_test():
    print("test sucsess")
    return render_template("test.html")

@app.route("/send_data", methods=['POST'])
def send_data():
    print("send data app")
    data = request.get_json()
    lat = float(data.get('lat'))
    lng = float(data.get('lng'))
    
    # 何らかの処理を行い、"success"を付けてJavaScriptに返す
    response_data = {'result': 'success', 'lat': lat - 1.0, 'lng': lng - 1.0 }
    return jsonify(response_data)

if __name__ == "__main__":
    webbrowser.open('http://localhost:8000')
    app.run(debug=True,host='localhost', port=8000, threaded=True, use_reloader=False)
