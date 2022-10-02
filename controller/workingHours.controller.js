const db = require("../database/config");
const moment = require("moment");
const { Op } = require("sequelize");
Employee_Hour = db.employee_Hour;

//Calculating hours
const getHoursformTime = (stime, etime) => {
  const dateFormat = "YYYY-MM-DD HH:mm:ss";
  const duration = moment(moment(etime).format(dateFormat)).diff(
    moment(stime).format(dateFormat),
    "minutes"
  );
  const hour_minute = parseFloat(
    parseInt(duration / 60) + "." + parseInt(duration % 60)
  );
  return hour_minute;
};

//reorganizing data
const manipulateData = (data) => {
  const chartData = [];
  let series;
  data.forEach((d) => {
    const foundValue = chartData.find((value) => {
      return value.name == d.dataValues.project_id;
    });

    if (foundValue === undefined) {
      const hourData = [];
      hourData.push(parseFloat(d.dataValues.hours.toFixed(2)));

      series = {
        name: d.dataValues.project_id,
        data: hourData,
        working_date: [d.dataValues.date],
      };
      chartData.push(series);
    } else {
      chartData.forEach((cd) => {
        if (cd.name === d.dataValues.project_id) {
          if (!cd.working_date.includes(d.dataValues.date)) {
            cd.data.push(d.dataValues.hours);
            cd.working_date.push(d.dataValues.date);
          } else {
            const index = cd.working_date.indexOf(d.dataValues.date);
            cd.data[index] = cd.data[index] + d.dataValues.hours;
          }
        }
      });
    }
  });
  return chartData;
};

const updateEmployee_hour = async (req, res) => {
  try {
    const info = await Employee_Hour.findOne({
      where: {
        employee_id: req.params.eid,
        project_id: req.params.pid,
        date: req.params.did,
      },
    });
    const hour_minute = getHoursformTime(
      info.dataValues.start_time,
      req.body.end_time
    );
    try {
      const data = await Employee_Hour.update(
        {
          end_time: req.body.end_time,
          hours: hour_minute.toFixed(2),
        },
        {
          where: {
            project_id: req.params.pid,
            employee_id: req.params.eid,
            date: req.params.did,
          },
        }
      );
      res.status(200).json({
        status: true,
        message: data,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: `${err} Something went wrong`,
      });
    }
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err} Something went wrong`,
    });
  }
};

const createEmployee_hour = async (req, res) => {
  try {
    await Employee_Hour.create({
      employee_id: req.body.employee_id,
      project_id: req.body.project_id,
      date: req.body.date,
      start_time: req.body.start_time,
    });
    res.status(200).json({
      status: true,
      message: `Data was inserted`,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err} Something went wrong`,
    });
  }
};

const getHoursByEmployee = async (req, res) => {
  console.log(req.query);
  const employee = req.query.employee;
  const project = req.query.project;
  const sdate = req.query.sdate || "2022-09-20";
  const edate = req.query.edate || "2022-09-21";

  const query = {
    [Op.or]: [
      {
        date: {
          [Op.between]: [sdate, edate],
        },
      },
    ],
  };

  if (employee && project) {
    query.employee_id = employee;
    query.project_id = project;
  }
  if (employee) {
    query.employee_id = employee;
  }
  if (project) {
    query.project_id = project;
  }

  try {
    const data = await Employee_Hour.findAll({
      where: query,
      order: [["date", "ASC"]],
    });

    const chartData = manipulateData(data);
    res.status(200).json({
      status: true,
      ChartData: chartData,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err} Something went wrong`,
    });
  }
};

module.exports = {
  updateEmployee_hour,
  createEmployee_hour,
  getHoursByEmployee,
};