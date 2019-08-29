# gatewayscript-aws
Datapower's Gateway script Javascript module, contains the following methods:

# apirequest(s3params, callback)

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
  
 # callback:
 callback function recive the following params:
 - error obj:
  {"responseCode":statusCode, "error":'error message'}
 - response obj:
 {"code": aws statusCode, "headers":aws response headers, "data":'response data'}
 

