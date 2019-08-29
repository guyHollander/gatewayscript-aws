const urlopen = require('urlopen');
const crypto = require('crypto');
const querystring = require ('querystring');
const hm = require('header-metadata');



/*
    Example Of the parameters object this module consume. some of them are mandatory,
    depends on the function used.

    var s3params = {
        "service": 's3', // the name of the aws service.
        "region": 'eu-west-1', // the region in which the bucket is located
        "host": 's3.eu-west-1.amazonaws.com', // the host address s3 service
        "method": 'GET|PUT|DELETE',
        "credentials": 'AWSAccessKeyId:AWSAccessKeySecret' // the amz user credentials. if not provided send anonymous request.
        "Content-Type":"text/plain",
        "amz-headers": {}, // amz-headers and their value if require. No need to add amz-x-date as the module generate one for each request.
        "querystr":'', // querystring for request
        "objPath": 'test/tst.txt', // path to the require object without the leading '/' and the bucket
        "bucketName": 'guytest', // bucket name
        "data": "Welcome to Amazon S3." // data
   }

*/

function AWSAuthSignature(awsParams, callback) {

    var error = null
    var autherization;
    var requestheaders;

    /* Create credential string for Auth */

    try {
      // TimeStamp of Request


      var dateAsDigit = isoDate.substring(0,isoDate.indexOf('T'));
      var credential = dateAsDigit + '/' + awsParams.region + '/' + awsParams.service + '/aws4_request'
    } catch(e) {
      error = e;
      callback(error, autherization, requestheaders);
    }


    /*  Create a Canonical  HTTP Headers */
    if(!awsParams.data){awsParams.data = ''};
    try {
      // Calcualte the Data hash

      var hash = crypto.createHash('sha256')
      var contentHash = hash.update(awsParams.data).digest('hex');
      // sort HTTP headers alphabetically

      requestheaders = {"host":awsParams.host, "x-amz-date":isoDate, "x-amz-content-sha256":contentHash};
      if(awsParams['Content-Type']){
        requestheaders['Content-Type'] = awsParams['Content-Type'];
      }
      if(awsParams['amz-headers']){
        Object.keys(awsParams['amz-headers']).forEach(key => requestheaders[key] = awsParams['amz-headers'][key]);
      }

      var sortedRequestHeaders = {};
      var sortedRequestHeadersArray = Object.keys(requestheaders).sort()
      sortedRequestHeadersArray.forEach(function(key) {
          var lowerCaseKey = key.toLowerCase();
          sortedRequestHeaders[lowerCaseKey] = requestheaders[key];
        });

      var canonicalHeaders = JSON.stringify(sortedRequestHeaders).replace(/[,]/g, '\n').replace(/[\"{}]/g,'') + '\n';
      var canonicalSignedHeaders = sortedRequestHeadersArray.toString().replace(/[\,]/g, ';').toLowerCase().
      console.log('Canonical Headers to sign: ' + canonicalHeaders);
    } catch (e) {
      error = e;
      callback(error, autherization, requestheaders);
    }

    /* Create a Canonical URI encoded string */
    var canonicalUri = '/' +  encodeURI(awsParams.bucketName) + '/' + encodeURI(awsParams.objPath);

    /* Create a Canonical querystring */
    try {
      var canonicalQuerystring = '';
      if(awsParams.querystr){
        var queryObj = querystring.parse(awsParams.querystr)
        var sortedqueryObj = {}
        Object.keys(queryObj).sort().forEach(function(key) {
            canonicalQuerystring = sortedqueryObj[key] = queryObj[key];
          });
        canonicalQuerystring = querystring.stringify(sortedqueryObj)
      }

      console.log('Canonical URI String To Sign: ' + canonicalQuerystring);
    } catch (e) {
      error = e;
      callback(error, autherization, requestheaders);
    }


    /* Create a Canonical Request string */
    var canonicalReq = awsParams.method + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\n' + canonicalSignedHeaders + '\n' + contentHash;
    console.log('Canonical request to sign: %s', canonicalReq);

    var canonicalReqHash = crypto.createHash('sha256');
    var hasedCanonicalReq = canonicalReqHash.update(canonicalReq).digest('hex');
    console.log(hasedCanonicalReq);
    var stringToSign = 'AWS4-HMAC-SHA256' + '\n' + isoDate + '\n' + credential + '\n' + hasedCanonicalReq;
    console.log('string to Sign: ' + stringToSign);

    CreateSigningKey(awsParams, dateAsDigit, function(err, key){
      if (err) {
        error = err;
      }
      var hmac = crypto.createHmac('hmac-sha256', key);
      var signature = hmac.update(stringToSign).digest('hex');
      autherization = 'AWS4-HMAC-SHA256 ' + 'Credential=' + awsParams.AWSAccessKeyId + '/' + credential + ',' + 'SignedHeaders=' + canonicalSignedHeaders + ',' + 'Signature=' + signature;

      callback(error, autherization, requestheaders);
    })

}

function CreateSigningKey(awsParams, date, callback) {
  var error = null;
  // var AWSAccessKeyId = awsParams.credentials.substring(0 ,awsParams.credentials.indexOf(':'));
  // var AWSAccessKeySecret = awsParams.credentials.substring(awsParams.credentials.indexOf(':') + 1);

  var kSigning;
  try {
    console.log(awsParams.AWSAccessKeySecret);
    var key = new Buffer('AWS4' + awsParams.AWSAccessKeySecret)
    var hmac256 = crypto.createHmac('hmac-sha256', key);

    var kDate = hmac256.update(date).digest();

    var kRegion = crypto.createHmac('hmac-sha256', kDate);
    kRegion =  kRegion.update(awsParams.region).digest();

    var kService = crypto.createHmac('hmac-sha256', kRegion);
    kService = kService.update(awsParams.service).digest();

    kSigning = crypto.createHmac('hmac-sha256', kService);
    kSigning = kSigning.update('aws4_request').digest();

    callback(error, kSigning);

  } catch (e) {
    error = e;
    callback(error, kSigning)

  }

}

var date = new Date()
var isoDate = date.toISOString().split('.')[0]+"Z";
isoDate = isoDate.replace(/[\:\.\-]/gi,'')
console.log('Timestamp at ISO format: %s', isoDate);


module.exports = {


  apirequest: function (s3params, callback) {

    var error = null;
    var s3response = {};

    if (!s3params.AWSAccessKeySecret) {
      /*** Send anonymous request ***/

      // build target url
      var uriString = '/' + s3params.bucketName;
      if (s3params.objPath) {uriString = uriString + '/' + s3params.objPath};
      if (s3params.querystr) {uriString = uriString + '?' + s3params.querystr};
      var targetUrl = 'https://' + s3params.host + uriString;
      // build request headers
      var requestheaders = {"host":s3params.host, "x-amz-date":isoDate};
      if(s3params['Content-Type']){
        requestheaders['Content-Type'] = s3params['Content-Type'];
      };
      if (s3params['amz-headers']) {
        Object.keys(s3params['amz-headers']).forEach(key => requestheaders[key] = s3params['amz-headers'][key]);

      }

      // set the DP url open request properties
      var options = {
        'target': targetUrl,
        'method': s3params.method,
        'headers': requestheaders
       };

      // add data if needed
      if (s3params.data){options.data = s3params.data};

      // send api request
      urlopen.open(options, function(err, res){
        if (err) {
          error = {"responseCode": null, "error":'failed to connect to target url: ' + JSON.stringify(err)}
          callback(error, res);
        } else {
          s3response.code = res.statusCode;
          s3response.headers = res.headers;
          res.readAsBuffer(function(bufErr,buffer){
            if (bufErr) {
                error = {"responseCode":res.statusCode, "error":'Failed to read response data'}
                callback(error,s3response);
            } else {
              s3response.data = buffer.toString();
              callback(error, s3response)
            }
          })

        }
      })
    }

    else {
      /*** Send Authenticated request ***/


      /*
        AWSAuthSignature function cauculate the AWS4 signature using the credentials and request paramters provided
        in the s3params object

        as the http request headers are needed for the cauculation of the AWS4,
        the creation of the headers object take place at the aws auth signature function .
        */

     AWSAuthSignature(s3params, function(err, auth, requestheaders) {

       requestheaders['Authorization'] = auth;

       // build target url
       var uriString = '/' + s3params.bucketName;
       if (s3params.objPath) {uriString = uriString + '/' + s3params.objPath};
       if (s3params.querystr) {uriString = uriString + '?' + s3params.querystr};
       var targetUrl = 'https://' + s3params.host + uriString;

       // set the DP url open request properties
       var options = {
         'target': targetUrl,
         'method': s3params.method,
         'headers': requestheaders
        };

       // add data if needed
       if (s3params.data){options.data = s3params.data};

       // send api request
       urlopen.open(options, function(err, res){
         if (err) {
           error = {"responseCode": null, "error":'failed to connect to target url: ' + JSON.stringify(err)}
           callback(error, res);
         } else {
           s3response.code = res.statusCode;
           s3response.headers = res.headers;
           res.readAsBuffer(function(bufErr,buffer){
             if (bufErr) {
                 error = {"responseCode":res.statusCode, "error":'Failed to read response data'}
                 callback(error,s3response);
             } else {
               s3response.data = buffer.toString();
               callback(error, s3response)
             }
           })

         }
       });

      });



    }

  }
  }
