require("dotenv").config(); // 載入.env環境檔

// Googlesheet 憑證
// const fs = require('fs').promises;
// const path = require('path');
const process = require("process");
const googleSheet = require("./googleSheet");

//取出 .env檔案填寫的FB資訊
const fb_username = process.env.FB_USERNAME;
const fb_password = process.env.FB_PASSWORD;

const webdriver = require("selenium-webdriver"); //加入虛擬網頁套件
(By = webdriver.By), // 你想要透過什麼方式來抓取元?
  (until = webdriver.until); //直到抓到元件才進行下一步(可設定等待時間)
const path = require("path"); // 用於處理文件路徑的小工具
// const chromeDriverPath = path.join(__dirname, "chromedriver"); 

const chrome = require("selenium-webdriver/chrome");
const options = new chrome.Options();
// 因為 notifications 會干擾到爬蟲，所以要先把它關掉
// options.setChromeBinaryPath(chromeDriverPath);
options.setUserPreferences({
  "profile.default_content_setting_values.notifications": 1,
});


const fs = require("fs").promises; // 讀取檔案用

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

async function loginFacebook() {
  // 宣告一個變數把爬到的所有資料給丟進去;
  let webCrawlerTotalContent = [];
  // 建立這個Brower 的類型
  let driver = await new webdriver.Builder()
    .forBrowser("chrome")
    .withCapabilities(options)
    .build();
  const web =
    "https://www.facebook.com/login/device-based/regular/login/?login_attempt=1&lwv=120&lwc=1348028"; //填寫要去的網站
  await driver.get(web); //透過這個 driver 打開網頁

  const fb_email_ele = await driver.wait(
    until.elementLocated(By.xpath(`//*[@id="email"]`))
  );
  await fb_email_ele.sendKeys(fb_username);
  const fb_pass_ele = await driver.wait(
    until.elementLocated(By.xpath(`//*[@id="pass"]`))
  );
  await fb_pass_ele.sendKeys(fb_password);

  // 碰到的問題每次登入後面的兩位英文都是隨機的 所以爬蟲才找不到正確的id位置？

  const login_ele = await driver.wait(
    until.elementLocated(By.xpath(`//*[@id="loginbutton"]`))
  );
  await login_ele.click();

  // 用登入後才會有的元件，來判斷是否登入，這邊是用登入後才有的訊息列來當作登入成功

  // await driver.wait(until.elementLocated(By.xpath(`//*[contains(@class,"x1qhmfi1")]`)));
  await driver.wait(
    until.elementLocated(By.xpath(`//*[contains(@class,"x1lliihq")]`))
  );

  // 登入成功後再前往粉專頁面

  // 底下為 彰化-ACE8的粉專  此粉專都是文字形式
  let fan_page = "https://www.facebook.com/profile.php?id=100083084594510";

  await driver.get(fan_page);
  await driver.sleep(5000);

  // 登入粉專頁面結束 -------------------
  // 模擬使用者向下滑動的次數
  // 為什麼只要向下移一次就好，原因是因為假設移兩次，最新貼文的內容會不見;
  // let scrollTimes = 0;
  // while (scrollTimes < 1) {
  //   scrollTimes++;
  //   await driver.executeScript("window.scrollTo(0,document.body.scrollHeight)");
  //   await driver.sleep(2000);
  // };

  // 開始找尋文章貼文的div-class
  let fb_article_eles = await driver.findElements(
    By.className(
      "x193iq5w xeuugli x13faqbe x1vvkbs xlh3980 xvmahel x1n0sxbx x1lliihq x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x4zkp8e x3x7a5m x6prxxf xvq8zen xo1l8bm xzsf02u x1yc453h"
    )
  );

  //  fb_article_eles 確定是個陣列；
  // console.log(Array.isArray(fb_article_eles));\

  // 辨別所有"顯示更多"的位置並點擊一下;
  let clickSeemoreTimes = await driver.findElements(
    By.xpath(
      `//*[contains(@class,"xt0b8zv xzsf02u x1s688f") and text()="顯示更多"]`
    )
  );
  // 再次確認是否有clickSeemoreTimes;
  // console.log(clickSeemoreTimes.length);
  for (let i = 0; i < clickSeemoreTimes.length; i++) {
    const fb_search_seemore = await driver.wait(
      until.elementLocated(
        By.xpath(
          `//*[contains(@class,"xt0b8zv xzsf02u x1s688f") and text()="顯示更多"]`
        )
      )
    );
    await driver.executeScript("arguments[0].click();", fb_search_seemore);
    await driver.sleep(2000);
  }
  await driver.sleep(3000);
  // 爬出所有內容，但部分內容我不需要所以要過濾

  // 檢查每一個element裡的內容;
  for (const fb_article_ele of fb_article_eles) {
    let fb_article_text = await fb_article_ele.getText();

    // console.log(fb_article_text);
    // 假設內容內有包含 賽事字串 則回傳賽事字串的位置，如果沒有則會回傳-1 ，代表我可以以此來過濾掉我不要的內容.
    if (fb_article_text.indexOf("賽事") > 0) {
      // 把我要的賽事裡的全部字串全部顯示出來,
      console.log("*********我是彰化Ace8賽事*********");

      // 我以文章內的 "-" 當作我要文章的切分點，順便以陣列的長度來當作運行方法的次數
      let fb_content_v1 = fb_article_text.substring(0);
      let fb_content_v2 = fb_content_v1.split(/\-\s|\(-\)/);
      let iterationTime = 0;
      iterationTime = fb_content_v2.length - 1;

      // 全部包含賽事貼文的文字都在這
      console.log(fb_content_v1);

      for (let x = 0; x < iterationTime; x++) {
        // 宣告一個陣列去儲存爬到的資料;
        let webCrawlerContent = [];

        // 判斷是否有 xx/xx 格式的字串
        let fb_content_date = /\d{1,2}[/]\d{1,2}/g;
        let fb_content_dateMatch = fb_content_date.exec(fb_content_v1);
        if (fb_content_dateMatch !== null) {
          console.log("date:" + fb_content_dateMatch[0]);
          webCrawlerContent.push("2023/" + fb_content_dateMatch[0]);
        } else {
          fb_content_dateMatch = "";
          webCrawlerContent.push(fb_content_dateMatch);
          console.log("----沒有比賽日期----");
        }

        // 判斷是否有 xx:xx 時間格式字串
        let fb_content_time = /\d{1,2}:\d{1,2}/g;
        let fb_content_timeMatch = fb_content_time.exec(fb_content_v2[x]);
        if (fb_content_timeMatch !== null) {
          console.log("time:" + fb_content_timeMatch[0]);
          webCrawlerContent.push(fb_content_timeMatch[0]);
        } else {
          fb_content_timeMatch = "";
          webCrawlerContent.push(fb_content_timeMatch);
          console.log("----沒有比賽時間----");
        }

        // 判斷是否有 xxxxx賽 的格式字串
        // let fb_content_nameMatch = await fb_content_v2[x].match(/(\d{2}:\d{2}(.+賽)\S*)/g);
        let fb_content_nameMatch = fb_content_v2[x].match(
          /(\d{2}:\d{2}\n?(.+賽)\S*)|(\d{2}\uFF1A+\d{2}\n?(.+賽)\S*)/g
        );
        // console.log("總共抓到的比賽"+fb_content_nameMath)
        if (fb_content_nameMatch !== null) {
          let fb_content_name = fb_content_nameMatch[0].substring(5);
          console.log("name:" + fb_content_name);
          webCrawlerContent.push(fb_content_name);
        } else {
          let fb_content_name = "";
          webCrawlerContent.push(fb_content_name);
          console.log("----沒有比賽名稱----");
        }

        // 判斷是否有 報名費: XXX 的格式字串
        let fb_content_buyInMatch =
          fb_content_v2[x].match(/報名費：(\d{1,4})/g);
        // console.log("全部的---buyIn:"+fb_content_buyInMath);
        if (fb_content_buyInMatch !== null) {
          let fb_content_buyIn = fb_content_buyInMatch[0].substring(4);
          console.log("buyIn:" + fb_content_buyIn);
          webCrawlerContent.push(fb_content_buyIn);
        } else {
          let fb_content_buyIn = "";
          webCrawlerContent.push(fb_content_buyIn);
          console.log("----沒有報名費----");
        }

        // 判斷是否有 保證獎池xxxxx （金額） 的格式字串
        let fb_content_gtdMatch =
          fb_content_v2[x].match(/保證獎池(\d{1,6}\S+)/g);
        // console.log("全部的----gtd:"+fb_content_gtdMatch);
        if (fb_content_gtdMatch !== null) {
          let fb_content_gtd = fb_content_gtdMatch[0];
          if (fb_content_gtd == "保證獎池120萬") {
            let fb_content_gtdMatchV2 = fb_content_v2[x].match(/保證送出.*/g);
            if (fb_content_gtdMatchV2 !== null) {
              fb_content_gtd = fb_content_gtdMatchV2[0];
            }
          }
          console.log("gtd:" + fb_content_gtd);
          webCrawlerContent.push(fb_content_gtd);
        } else {
          let fb_content_gtd = "";
          webCrawlerContent.push(fb_content_gtd);
          console.log("----沒有保證獎池----");
        }

        // 判斷是否有 冠軍xxxxx （金額）or (文字) 的格式字串
        let fb_content_gtdChampionMatch = fb_content_v2[x].match(/冠軍\S+/g);
        // console.log("全部的冠軍----gtd:"+fb_content_gtdChampionMatch);
        if (fb_content_gtdChampionMatch !== null) {
          let fb_content_gtdChampion = fb_content_gtdChampionMatch[0];
          console.log("gtdChampion:" + fb_content_gtdChampion.substring(2));
          webCrawlerContent.push(fb_content_gtdChampion.substring(2));
        } else {
          let fb_content_gtdChampion = "";
          webCrawlerContent.push(fb_content_gtdChampion);
          console.log("----沒有保證冠軍----");
        }

        // 判斷是否有 起始碼： xx萬 （金額） 的格式字串
        // let fb_content_startingStackMatch = await fb_content_v2[i].match(/起始碼：(\d+(\.\d{1,2})+\S)/g);
        let fb_content_startingStackMatch = fb_content_v2[x].match(/起始.*/g);
        // console.log("全部的----gtd:"+fb_content_gtdMatch);
        if (fb_content_startingStackMatch !== null) {
          let fb_content_startingStack =
            fb_content_startingStackMatch[0].substring(4);
          if (/\d\.\d[a-zA-Z]/.test(fb_content_startingStack)) {
            fb_content_startingStack =
              fb_content_startingStack.substring(0, 1) +
              fb_content_startingStack.substring(2, 3) +
              ",000";
          }
          if (/\d+\.?\d?[a-zA-Z]/.test(fb_content_startingStack)) {
            fb_content_startingStack =
              fb_content_startingStack.substring(0, 1) +
              fb_content_startingStack.substring(2, 3) +
              "0,000";
          }
          console.log("startingStack:" + fb_content_startingStack);
          webCrawlerContent.push(fb_content_startingStack);
        } else {
          let fb_content_startingStack = "";
          webCrawlerContent.push(fb_content_startingStack);
          console.log("----沒有起始碼----");
        }

        // 判斷是否有 升盲時間: xxx 的格是字串
        // let fb_content_levelTime = /升盲時間：(\d+min|\d+\/\d+分鐘)/g;
        let fb_content_levelTime =
          /升盲時間：(\d+min|\d+\/\d+\S|\d+\/\d+\s*\S*)/g;
        let fb_content_levelTimeMatch = fb_content_levelTime.exec(
          fb_content_v2[x]
        );
        if (fb_content_levelTimeMatch !== null) {
          console.log("levelTime:" + fb_content_levelTimeMatch[1]); // 输出匹配到的升盲时间信息，例如：10min、20/15分鐘等
          webCrawlerContent.push(fb_content_levelTimeMatch[1]);
        } else {
          let fb_content_levelTimeMatch = "";
          webCrawlerContent.push(fb_content_levelTimeMatch);
          console.log("----沒有升盲時間----");
        }

        // 判斷是否有 截止XX：XXXXX LVX 約XX:XX  的格式字串
        // let fb_content_regClosedEndMatch = await fb_content_v2[i].match(/截止\S+\s\S+/);
        let fb_content_regClosedEndMatch =
          fb_content_v2[x].match(/截止.*?\s\S+/);
        // console.log("全部的----regClosedEndMatch:"+fb_content_regClosedEndMatch);
        if (fb_content_regClosedEndMatch !== null) {
          let fbContentRegClosedEnd = fb_content_regClosedEndMatch[0];
          console.log("regClosedEnd:" + fbContentRegClosedEnd.substring(5));
          webCrawlerContent.push(fbContentRegClosedEnd.substring(5));
        } else {
          let fbContentRegClosedEnd = "";
          webCrawlerContent.push(fbContentRegClosedEnd);
          console.log("----沒有截止時間----");
        }
        webCrawlerTotalContent.push(webCrawlerContent);
        console.log("*********同篇貼文分隔線*********");
      }
    }
  }
  driver.quit();
  console.log(webCrawlerTotalContent);
  return webCrawlerTotalContent;
}

loginFacebook().then(async (result) => {
  await googleSheet.write(result);
});
