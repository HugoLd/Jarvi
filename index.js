const types = ["LINKEDIN_INMAIL_SENT", "LINKEDIN_MESSAGE_SENT", "EMAIL_SENT"];

(function initValues() {
  fetchStats();
  setChartData();
})();


function fetchStats() {
  const average12Months = fetchAverage12Months();
  fetchAveragePeriod(average12Months);
}

async function fetchAveragePeriod(average12Months) {
  const periodLength = 8;

  let date = new Date();
  date.setDate(date.getDate() - 7 * periodLength);
  date = date.toISOString();

  const now = new Date().toISOString();

  const resultData = fetchServer(
    `query MyQuery {\n  replied: historyentries_aggregate(where: {user_id: {_eq: "32ca93da-0cf6-4608-91e7-bc6a2dbedcd1"}, trigger_has_been_replied_to: {_eq: true}, created_at: {_gt: "${date}", _lte: "${now}"}}) {   aggregate {     count   }  },all : historyentries_aggregate(where: {user_id: {_eq: "32ca93da-0cf6-4608-91e7-bc6a2dbedcd1"}, created_at: {_gt: "${date}", _lte: "${now}"}}) {    aggregate {      count    }  }}`
  );

  return Promise.all([resultData, average12Months]).then(([res, average]) => {
    const percentage = getPercentageInAggregate(res);
    document.getElementById("average-period").innerHTML = percentage;
    document.getElementById("main").classList.remove("hidden");
    if (average > percentage) {
      document.getElementById("period-stat").classList.add("bad");
    } else {
      document.getElementById("period-stat").classList.add("good");
    }
  });
}

async function fetchAverage12Months() {
  let date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  date = date.toISOString();

  const now = new Date().toISOString();

  const resultData = fetchServer(
    `query MyQuery {\n  replied : historyentries_aggregate(where: {user_id: {_eq: "32ca93da-0cf6-4608-91e7-bc6a2dbedcd1"}, trigger_has_been_replied_to: {_eq: true}, created_at: {_gt: "${date}", _lte: "${now}"}}) {   aggregate {     count   }  },all: historyentries_aggregate(where: {user_id: {_eq: "32ca93da-0cf6-4608-91e7-bc6a2dbedcd1"}, created_at: {_gt: "${date}", _lte: "${now}"}}) {    aggregate {      count    }  }}`
  );

  return resultData.then((res) => {
    const percentage = getPercentageInAggregate(res);
    document.getElementById("average-12-months").innerHTML = percentage;
    return percentage;
  });
}

function setChartData() {
  const chartDataByType = fetchChartDataByType();

  const labels = [
    "Semaine - 7",
    "Semaine - 6",
    "Semaine - 5",
    "Semaine - 4",
    "Semaine - 3",
    "Semaine - 2",
    "Semaine - 1",
    "Semaine Actuelle",
  ];

  chartDataByType.then((dataByTypes) => {
    const data = {
      labels: labels,
      datasets: [
        {
          label: "Linkedin InMail",
          data: dataByTypes["LINKEDIN_INMAIL_SENT"],
          borderColor: "rgb(255, 159, 64)",
          backgroundColor: "rgba(255, 159, 64,0.5)",
          yAxisID: "y",
        },
        {
          label: "Linkedin Messages",
          data: dataByTypes["LINKEDIN_MESSAGE_SENT"],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192,0.5)",
          yAxisID: "y",
        },
        {
          label: "Mail",
          data: dataByTypes["EMAIL_SENT"],
          borderColor: "rgb(153, 102, 255)",
          backgroundColor: "rgba(153, 102, 255,0.5)",
          yAxisID: "y",
        },
      ],
    };
    const config = {
      type: "line",
      data: data,
      options: {
        responsive: true,
        interaction: {
          mode: "index",
          intersect: false,
        },
        stacked: false,
        plugins: {
          title: {
            display: true,
            text: "Taux de réponse",
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
          },
        },
      },
    };
    document.getElementById("loader").classList.add("hidden");
    new Chart(document.getElementById("project"), config);
  });
}

function fetchChartDataByType() {
  let baseQuery = "query MyQuery {";
  for (let type of types) {
    for (let i = 0; i < 8; i++) {
      let date = new Date();
      date.setDate(date.getDate() - 7 * (i + 1));
      date = date.toISOString();

      let now = new Date();
      now.setDate(now.getDate() - 7 * i);
      now = now.toISOString();
      baseQuery = baseQuery.concat(
        `${type}___replied___${
          8 - i
        }: historyentries_aggregate(where: {user_id: {_eq: "32ca93da-0cf6-4608-91e7-bc6a2dbedcd1"},type: {_eq: ${type}}, trigger_has_been_replied_to: {_eq: true}, created_at: {_gt: "${date}", _lte: "${now}"}}) {   aggregate {     count   }  },
      ${type}___all___${
          8 - i
        }:historyentries_aggregate(where: {user_id: {_eq: "32ca93da-0cf6-4608-91e7-bc6a2dbedcd1"},type: {_eq: ${type}}, created_at: {_gt: "${date}", _lte: "${now}"}}) {    aggregate {      count    }  }`
      );
    }
  }
  baseQuery = baseQuery + "}";

  const resultData = fetchServer(baseQuery);
  return resultData.then((res) => {
    const entries = Object.entries(res.data);
    return {
      LINKEDIN_INMAIL_SENT: getPercentageByType(
        entries,
        "LINKEDIN_INMAIL_SENT"
      ),
      LINKEDIN_MESSAGE_SENT: getPercentageByType(
        entries,
        "LINKEDIN_MESSAGE_SENT"
      ),
      EMAIL_SENT: getPercentageByType(entries, "EMAIL_SENT"),
    };
  });
}

function getPercentageInAggregate(result) {
  return getPercentage(
    result.data.replied.aggregate.count,
    result.data.all.aggregate.count
  );
}

function getPercentage(replied, all) {
  return Math.floor((replied / all) * 100);
}
function getPercentageByType(entries, type) {
  const separator = "___";
  const typeEntries = entries
    .filter((entry) => entry[0].split(separator)[0] === type)
    .sort(
      (entry1, entry2) =>
        entry1[0].split(separator)[2] > entry2[0].split("_")[2]
    );
  const allValue = typeEntries
    .filter((entry) => entry[0].split(separator)[1] === "all")
    .map((entry) => entry[1].aggregate.count);
  const repliedValue = typeEntries
    .filter((entry) => entry[0].split(separator)[1] === "replied")
    .map((entry) => entry[1].aggregate.count);
  return repliedValue.map((replied, index) =>
    getPercentage(replied, allValue[index])
  );
}

async function fetchServer(query) {
  const headers = new Headers();
  headers.append("x-hasura-admin-secret", "g^mVw6RB))Jt%l!6Ill22Nqyue=kXq,u");
  headers.append("Content-Type", "application/json");
  const graphql = JSON.stringify({
    query: query,
    variables: {},
  });
  const requestOptions = {
    method: "POST",
    headers: headers,
    body: graphql,
    redirect: "follow",
  };

  return fetch(
    "https://onvmepaqgtmcnsipxlnj.hasura.eu-central-1.nhost.run/v1/graphql",
    requestOptions
  ).then((response) => response.json());
}
