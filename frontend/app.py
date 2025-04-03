from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('patient_info.html')

@app.route('/patient_info')
def patient_info():
    return render_template('patient_info.html')

@app.route('/prescription')
def prescription():
    return render_template('prescription.html')

@app.route('/repair')
def repair():
    return render_template('repair.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000) 