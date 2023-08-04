import json
import subprocess

aapi_endpoints = {
	'NA': 'api-prod-na-us-east-1a.amazon.com',
	'EU': 'api-prod-eu-eu-west-1a.dub.amazon.com',
	'FE': 'api-prod-fe-us-west-2a.pdx.amazon.com',
	'CN': 'api-prod-cn-cn-north-1b.pek.amazon.com'
}

mktplace_region_mapping = {
	# NA mappings
	'ATVPDKIKX0DER': 'NA',

	# EU mapping
	'A21TJRUUN4KGV': 'EU',
	
	# CN mapping
	'AAHKV2X7AFYLW': 'CN'
}


class AAPIUtils:
	@staticmethod
	def get_aapi_endpoint(marketplace):
		try:
			return aapi_endpoints[mktplace_region_mapping[marketplace]]
		except Exception as e:
			print("Report exception", e)
			return aapi_endpoints["NA"]

	@staticmethod
	def get_cia():
		return "%7B%7D"

	@staticmethod
	def get_product_variants(customer_id, session_id, marketplace, asin):
		command = f"""
			curl -sS --negotiate --location-trusted -u: -c ~/.midway/cookie -b ~/.midway/cookie \
			--request GET \
			--header 'Accept: application/vnd.com.amazon.api+json; type="product/v2"; expand="twisterVariations(product.twister-variations/v2)"' \
			--header 'Accept-Language: en-US' \
			--header 'X-Amzn-Customer-Id: {customer_id}' \
			--header 'X-Amzn-Session-Id: {session_id}' \
			'https://api-sso-access.corp.amazon.com/{AAPIUtils.get_aapi_endpoint(marketplace)}/--/api/marketplaces/{marketplace}/products/{asin}?ccOverride_customerIntent={AAPIUtils.get_cia()}'
		"""

		raw_response = json.loads(subprocess.Popen(command, shell=True, stdout=subprocess.PIPE).stdout.read())

		# return raw_response

		response = {
			"variants": []
		}

		# return raw_response["entity"]["twisterVariations"]["entity"]["variations"]

		for variant in raw_response["entity"]["twisterVariations"]["entity"]["variations"]:
			try:
				response["variants"].append({
					"url": variant["product"]["resource"]["url"],
					"marketplace": variant["product"]["resource"]["url"].split('/')[3],
					"asin": variant["product"]["resource"]["url"].split('/')[5]
				})

				response["variants"][-1]["dimensions"] = dict()
				# return variant["values"]
				for dimension_value_index in range(len(variant["values"])):
					# return raw_response["entity"]["twisterVariations"]["entity"]["dimensionKeys"][dimension_value_index]["symbol"]
					response["variants"][-1]["dimensions"][
						raw_response["entity"]["twisterVariations"]["entity"]["dimensionKeys"][dimension_value_index][
							"displayString"]
					] = raw_response["entity"]["twisterVariations"]["entity"]["dimensionValues"][dimension_value_index][
						variant["values"][dimension_value_index]]
			except Exception as e:
				print(e)
				response["variants"].pop()

		return response

	@staticmethod
	def get_general_product_details(customer_id, session_id, marketplace, asin):
		command = f"""
				curl -sS --negotiate --location-trusted -u: -c ~/.midway/cookie -b ~/.midway/cookie \
				--request GET \
				--header 'Accept: application/vnd.com.amazon.api+json; type="product/v2"; expand="productImages(product.product-images/v2),buyingOptions[].price(product.price/v1),buyingOptions[].availability(product.availability/v2),"' \
				--header 'Accept-Language: en-US' \
				--header 'X-Amzn-Customer-Id: {customer_id}' \
				--header 'X-Amzn-Session-Id: {session_id}' \
				'https://api-sso-access.corp.amazon.com/{AAPIUtils.get_aapi_endpoint(marketplace)}/--/api/marketplaces/{marketplace}/products/{asin}?ccOverride_customerIntent={AAPIUtils.get_cia()}'
			"""

		raw_response = json.loads(subprocess.Popen(command, shell=True, stdout=subprocess.PIPE).stdout.read())
		# return raw_response

		response = {
			"amount": raw_response["entity"]["buyingOptions"][0]["price"]["entity"]["priceToPay"]["moneyValueOrRange"][
				"value"]["amount"],
			"currencyCode":
				raw_response["entity"]["buyingOptions"][0]["price"]["entity"]["priceToPay"]["moneyValueOrRange"][
					"value"]["currencyCode"],
			"imageUrl": f'https://m.media-amazon.com/images/I/{raw_response["entity"]["productImages"]["entity"]["images"][0]["lowRes"]["physicalId"]}.jpg',
			"availability": raw_response["entity"]["buyingOptions"][0]["availability"]["entity"]["type"]
		}

		return response

	@staticmethod
	def add_asin_to_cart(customer_id, session_id, marketplace, asin):
		command = f"""
					curl -sS --negotiate --location-trusted -u: -c ~/.midway/cookie -b ~/.midway/cookie \
					--request POST \
					--header 'Accept: application/vnd.com.amazon.api+json; type="cart.add-items/v1"' \
					--header 'Accept-Language: en-US' \
					--header 'X-Amzn-Customer-Id: {customer_id}' \
					--header 'X-Amzn-Session-Id: {session_id}' \
					--header 'Content-Type: application/vnd.com.amazon.api+json; type="cart.add-items.request/v1"' \
					--data '{{"items":[{{"asin":"{asin}"}}]}}' \
					'https://api-sso-access.corp.amazon.com/{AAPIUtils.get_aapi_endpoint(marketplace)}/--/api/marketplaces/{marketplace}/cart/carts/retail/items'
				"""

		# print(command)

		raw_response = json.loads(subprocess.Popen(command, shell=True, stdout=subprocess.PIPE).stdout.read())

		return raw_response
