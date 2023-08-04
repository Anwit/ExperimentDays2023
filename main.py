from utils.utils import *
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route('/product/variations/<obf_mktplace_id>/<asin>/<customer_id>/<session_id>', methods=['GET'])
def get_product_variants(obf_mktplace_id, asin, customer_id, session_id):
	try:
		response = AAPIUtils.get_product_variants(
			customer_id=customer_id,
			session_id=session_id,
			marketplace=obf_mktplace_id,
			asin=asin
		)

		return jsonify(response), 200
	except Exception as e:
		print(e)
		return jsonify({}), 500


@app.route('/product/details/<obf_mktplace_id>/<asin>/<customer_id>/<session_id>', methods=['GET'])
def get_general_product_details(obf_mktplace_id, asin, customer_id, session_id):
	try:
		response = AAPIUtils.get_general_product_details(
			customer_id=customer_id,
			session_id=session_id,
			marketplace=obf_mktplace_id,
			asin=asin
		)

		return jsonify(response), 200
	except Exception as e:
		print(e)
		return jsonify({}), 500


@app.route('/add-to-cart/<obf_mktplace_id>/<asin>/<customer_id>/<session_id>', methods=['GET'])
def add_asin_to_cart(obf_mktplace_id, asin, customer_id, session_id):
	try:
		response = AAPIUtils.add_asin_to_cart(
			customer_id=customer_id,
			session_id=session_id,
			marketplace=obf_mktplace_id,
			asin=asin
		)

		return jsonify(response), 200
	except Exception as e:
		print(e)
		return jsonify({}), 500


if __name__ == '__main__':
	app.run(debug=True, host='0.0.0.0')