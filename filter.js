

class Customer {
	constructor(id, state, city) {
		this.id = id;
		this.state = state;
		this.city = city;
	}
}

class OrderPayments{
    constructor(orderId, paymentType, paymentValue ){
        this.orderId = orderId;
        this.paymentType = paymentType;
        this.paymentValue = paymentValue;
    }
}

class Orders{
    constructor(id, customerId, status, deliveredCustomer, estimatedDelivery){
        this.id = id;
        this.customerId = customerId;
        this.status = status;
        this.deliveredCustomer = deliveredCustomer;
        this.estimatedDelivery = estimatedDelivery;
    }
}

class ProductCategory{
    constructor(name){
        this.name = name
    }
}


class Geolocation {
	constructor(geolocationId, city, state) {
	this.geolocationId = geolocationId;
    this.city = city;
    this.state = state;
	}
}

class Order_Items {
	constructor(orderId, itemId, productId, sellerId, shippingLimitDate, price, freightValue) {
	this.orderId = orderId;
	this.itemId = itemId;
	this.productId = productId;
	this.sellerId = sellerId;
	this.shippingLimitDate = shippingLimitDate;
	this.price = price;
	this.freightValue = freightValue;
	}	
} 


class Order_Reviews_Dataset {
	constructor(reviewsId, score) {
	this.score = score;
  	this.reviews = reviewsId;
	}
}

class Products {
	constructor(productId, categoryName, productNameLength, productDescriptionLength, productPhotosQty, productWeightG, productLengthCm, productHeightCm, productWidthCm) {
	this.productId = productId;
	this.categoryName = categoryName;
	this.productNameLength = productNameLength;
	this.productDescriptionLength = productDescriptionLength;
	this.productPhotosQty = productPhotosQty;
	this.productWeightG = productWeightG;
	this.productLengthCm = productLengthCm;
	this.productHeightCm = productHeightCm;
	this.productWidthCm = productWidthCm;
	}
}

class Sellers {
	constructor(sellerId, sellerZipCodePrefix, sellerCity, sellerState) {
	this.sellerId = sellerId;
	this.sellerZipCodePrefix = sellerZipCodePrefix;
	this.sellerCity = sellerCity;
	this.sellerState = sellerState;
	}
}

var leitorDeCSV = new FileReader();
var leitorDeCSV2 = new FileReader();
var leitorDeCSV3= new FileReader();
var leitorDeCSV4 = new FileReader();
var leitorDeCSV5 = new FileReader();
var leitorDeCSV6 = new FileReader();
var leitorDeCSV7 = new FileReader();
var leitorDeCSV8 = new FileReader();
var leitorDeCSV9 = new FileReader();


var totalArquivoTipo1 = 0;
var totalArquivoTipo2 = 0;
var totalArquivoTipo3 = 0;
var totalArquivoTipo4 = 0;
var totalArquivoTipo5 = 0;
var totalArquivoTipo6 = 0;
var totalArquivoTipo7 = 0;
var totalArquivoTipo8 = 0;
var totalArquivoTipo9 = 0;


window.onload = function init() {
	leitorDeCSV.onload = leCSV;
	leitorDeCSV2.onload = leCSV2;
	leitorDeCSV3.onload = leCSV3;
	leitorDeCSV4.onload = leCSV4;
	leitorDeCSV5.onload = leCSV5;
	leitorDeCSV6.onload = leCSV6;
	leitorDeCSV7.onload = leCSV7;
	leitorDeCSV8.onload = leCSV8;
	leitorDeCSV9.onload = leCSV9;
}

function pegaCSV(inputFile) {
	var file = inputFile.files[0];
	leitorDeCSV.readAsText(file);
}


function converterCsvCustomerParaObjeto(csv) {
	var linhas = csv.split('\n');
	var customers = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');

		if (campos.length == 2)
			customers.push(new Customer(campos[0],campos[1],campos[2]))
	}

	return customers;
}

function converterCsvOrderPaymentsParaObjeto(csv) {
	var linhas = csv.split('\n');
	var orderPayments = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');
		if (campos.length < 2) continue;

		if (campos.length == 2)
			orderPayments.push(new OrderPayments(campos[0],campos[1],campos[2]))
	}

	return orderPayments;
}

function converterCsvProductCategoryParaObjeto(csv) {
	var linhas = csv.split('\n');
	var orderPayments = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');

		contas.push(new ProductCategory(campos[0]))
	}

	return orderPayments;
}

function converterCsvOrderItemsParaObjeto(csv) {
	var linhas = csv.split('\n');
	var orderItems = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');

		orderItems.push(new Order_Items(campos[0]),(campos[1]),(campos[2]),(campos[3]),(campos[4]),(campos[5]),(campos[6]))
	}

	return orderItems;
}


function converterCsvGeolocationParaObjeto(csv) {
	var linhas = csv.split('\n');
	var geoLocation = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');

		geoLocation.push(new Geolocation(campos[0],campos[1],campos[2]))
	}

	return geoLocation;
}

function converterCsvContasParaObjeto(csv) {
	var linhas = csv.split('\n');
	var orders = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');
		orders.push(new Conta(campos[0], null, campos[1], campos[2], campos[3]));
	}

	return orders;
}

function converterCsvContasParaObjeto(csv) {
	var linhas = csv.split('\n');
	var ordersReviews = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');
		ordersReviews.push(new Conta(campos[0], null, campos[1]));
	}

	return ordersReviews;
}

function converterCsvContasParaObjeto(csv) {
	var linhas = csv.split('\n');
	var sellers = [];

	for (var i = 1; i < linhas.length; i++) {
		var campos = linhas[i].split(';');
		sellers.push(new Conta(campos[0], null, campos[1], campos[2], campos[3]));
	}

	return sellers;
}

//LEITURA DE CSV !!!


function leCSV(evt) {
	var contas = converterCsvContasParaObjeto(evt.target.result);

	totalArquivoTipo1 = 0;
	for (var i in contas) {
		totalArquivoTipo1 += contas[i].saldo;
	}

	var fileArr = evt.target.result.split('\n');
	var strDiv = '<table>';

	for ( var i = 0; i < fileArr.length; i++) {
		strDiv += '<tr>';
		var fileLine = fileArr[i].split(';');
		for ( var j = 0; j < fileLine.length; j++) {
			strDiv += '<td>' + fileLine[j].trim() + '</td>';
		}
		strDiv += '</tr>';
	}
	// Imprime total 2
	strDiv += '<tr>';
	strDiv += '<td>Total</td>';
	strDiv += '<td>' + totalArquivoTipo1 + '</td>';
	strDiv += '</tr>';

	strDiv += '</table>';

	var CSVsaida = document.getElementById('CSVsaida');
	CSVsaida.innerHTML = strDiv;
}

function leCSV2(evt) {
	var contas = converterCsvContasParaObjeto(evt.target.result);

	totalArquivoTipo2 = 0;
	for (var i in contas) {
		totalArquivoTipo2 += contas[i].saldo;
	}

	var fileArr = evt.target.result.split('\n');
	var strDiv = '<table>';

	for ( var i = 0; i < fileArr.length; i++) {
		strDiv += '<tr>';
		var fileLine = fileArr[i].split(';');
		for ( var j = 0; j < fileLine.length; j++) {
			strDiv += '<td>' + fileLine[j].trim() + '</td>';
		}
		strDiv += '</tr>';
	}

	// Imprime total 2
	strDiv += '<tr>';
	strDiv += '<td>Total</td>';
	strDiv += '<td>' + totalArquivoTipo2 + '</td>';
	strDiv += '</tr>';
	strDiv += '</table>';

	var CSVsaida = document.getElementById('CSVsaida2');
	CSVsaida.innerHTML = strDiv;
}


