//ALTERNATIVE FILE UPLOADING
function createNewProduct(token) {
    console.log('createNewProduct');
    return $.ajax({
        url:'/api/product',
        method: 'POST',
		beforeSend: function(request) {
			request.setRequestHeader("x-access-token", token);
		},
        contentType: false,
        processData: false,
        data: new FormData($('#prodregister')[0])
    });
}