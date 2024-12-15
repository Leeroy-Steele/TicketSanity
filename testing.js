const myHeaders = new Headers();
myHeaders.append("Authorization", "Basic bXNmbG93QGxhbmNvbXRlY2hub2xvZ3kub25taWNyb3NvZnQuY29tOnhLQjdLcldLbDV6cThZN0cxQ2E3QTBFNw==");
myHeaders.append("Cookie", "atlassian.xsrf.token=cac20354151168f7659cc19ddc909f2c081c101e_lin");

const requestOptions = {
  method: "GET",
  headers: myHeaders,
  redirect: "follow"
};

fetch("https://lancom.atlassian.net/rest/agile/1.0/board/144/issue?maxResults=200", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));