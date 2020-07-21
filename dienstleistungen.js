const fs = require("fs").promises;
const request = require("request-promise");
const cheerio = require("cheerio");

request("https://service.berlin.de/dienstleistungen/")
  .then((response) => {
    const data = [];

    let $ = cheerio.load(response);

    const blocks = $(".azlist .ort-group");

    for (let index = 0; index < blocks.length; index += 1){
      const items = [];

      const subblocks = $(blocks[index]).find(".topic-dls a");
      for (let sIndex = 0; sIndex < subblocks.length; sIndex += 1){
        items.push({
          label: $(subblocks[sIndex]).text().replace("\n", "").trim(),
          url: "https://service.berlin.de" + $(subblocks[sIndex]).attr("href"),
        });
      }

      data.push({
        items,
        letter: $(blocks[index]).find(".azlist-letter").text().substr(0,1),
      });
    }

    return fs.writeFile("atoz-output.json", JSON.stringify(data), "utf8");
  })
  .then(() => {
    console.log("done");
    process.exit();
  })
  .catch((err) => {
    throw err;
  });
