const fetch = require('node-fetch');
const twig = require('twig');
const sizeOf = require('image-size');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

let siteData = {country:'no',client:'Mjolfjell 1.0.0',hotelId:'fa940cf7-b7dd-4ec5-a52c-5425ff69313b'};
let logo, image;


function render() {
    return new Promise((resolve, reject) => {
        twig.renderFile('templates/index.twig', siteData, (error, html) => {
            // resolve(html);
            let destinationPath = 'docs/index.html';
            mkdirp(path.dirname(destinationPath), error => {
                if (error) {
                    throw error;
                }
                //html = minify ? minifier(html, config.tasks.htmlmin.options) : html;
                fs.writeFile(destinationPath, html, error => {
                    if (error) {
                        throw error;
                    }
                });
            });
        });
    });
}

var initialize = fetch('https://demo.mews.li/api/distributor/v1/hotels/get', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    method: "POST",
    body: JSON.stringify({
        "Client": "Mjolfjell 1.0.0",
        //"HotelId": "2b5a4f41-b367-4235-a08f-f5fb3595948a"
        "HotelId": "fa940cf7-b7dd-4ec5-a52c-5425ff69313b"
    })
}).then(function (result) {
    if (result.status !== 200) {
        throw result;
    }
    return result.json();
}).then(function (result) {
    siteData.image = result.ImageBaseUrl + '/' + result.IntroImageId;
    siteData.logo = result.ImageBaseUrl + '/' + result.ImageId;
    siteData.name = result.Name['en-US'];
    siteData.email = result.Email;
    siteData.supportedCards = [];
    for (let i = 0; i < result.PaymentGateway.SupportedCreditCardTypes.length; i++) {
        var card = result.PaymentGateway.SupportedCreditCardTypes[i];
        siteData.supportedCards.push(card);
    }
    siteData.countries = [];
    for (let i = 0; i < result.Countries.length; i++) {
        var country = result.Countries[i];
        siteData.countries.push({code:country.Code,name:country.Name});
    }

    // siteData.description = result.Description['en-US'];

    siteData.roomCategories = {};
    for (let i = 0; i < result.RoomCategories.length; i++) {
        var room = result.RoomCategories[i];
        var roomImages = [];
        for (var j = 0; j < room.ImageIds.length; j++) {
            var id = room.ImageIds[j];
            roomImages.push(result.ImageBaseUrl + '/' + id);
        }
        if (roomImages.length == 0) {
            roomImages.push('http://placehold.it/400x267');
        }
        siteData.roomCategories[room.Id] = {name: room.Name['en-US'], images: roomImages, type: room.SpaceType.toUpperCase(), id:room.Id};
        //siteData.rooms.push({id:room.Id,name:room.Name['en-US'],images:roomImages, type:room.SpaceType.toUpperCase()});
    }

    siteData.extras = [];

    for (var i = 0; i < result.Products.length; i++) {
        var product = result.Products[i];
        siteData.extras.push({
            id: product.Id,
            name: product.Name['en-US'],
            price: product.Prices['EUR'],
            default: product.IncludedByDefault,
            image: (product.ImageId ? result.ImageBaseUrl + '/' + product.ImageId : 'http://placehold.it/400x267')
        });
    }

    // siteDate.email = result.Email;
    // console.log(JSON.stringify(siteData));
    return Promise.all([fetch(siteData.image).then(function (result) {
        return result.buffer();
    }).then(function (result) {
        siteData.imageInfo = sizeOf(result);
        return new Promise(function(resolve, reject) {
            let outfile = 'docs/bg.jpeg';
            fs.writeFile(outfile, result, function (err) {
                if (err) return reject(err);
                return resolve(outfile);
            });
        });
    }), fetch(siteData.logo).then(function (result) {
        return result.buffer();
    }).then(function (result) {
        siteData.logoInfo = sizeOf(result);
        return new Promise(function(resolve, reject) {
            let outfile = 'docs/logo.png';
            fs.writeFile(outfile, result, function (err) {
                if (err) return reject(err);
                return resolve(outfile);
            });
        });
    })]).then(function () {
        return render();
    });
}).catch(function (err) {
    console.error(err);
});



