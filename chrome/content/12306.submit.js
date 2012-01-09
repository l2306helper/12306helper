function _selectHasValue(sel, value) {
    var options = sel.getElementsByTagName("option");
    for (var i = 0; i < options.length; i++) {
        var option = options[i];
        if (option.value == value) {
            return true;
        }
    }
    return false;
}

function _appendIfNotExists(sel, value, label) {
    if (sel && !_selectHasValue(sel, value)) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        sel.appendChild(option);
    }
}

function _showHiddenInput(input, label) {
    if (!input) {
        return;
    }
    
    if (input.type == "hidden") {
        input.type = "input";
        
        if (label) {
            var labelElem = document.createElement("label");
            labelElem.textContent = label;
            input.parentNode.insertBefore(labelElem, input);
        }
        
        input.onchange = function() {
            // change confirmation info.
            if (unsafeWindow.train_date_str_) {
                unsafeWindow.train_date_str_ = this.value;
            }
            
            var strInput = document.getElementById("_train_date_str");
            if (strInput) {
                strInput.value = this.value;
            }
        }
    }
}

function _completeSeats() {
    var seats = document.getElementsByTagName("select");
    var station_train_code = document.getElementById("station_train_code").value;
    var code = station_train_code.charAt(0);
    var isDongche = code == 'D' || code == 'G';
    for (var i = 0; i < seats.length; i++) {
        if (/passenger_[\d]+_seat/i.test(seats[i].id)) {
            // Add more passenger seats
            if (isDongche) {
              _appendIfNotExists(seats[i], "9", "商务座(不一定有)");
              _appendIfNotExists(seats[i], "M", "一等座(不一定有)");
              _appendIfNotExists(seats[i], "O", "二等座(不一定有)");
            }

            _appendIfNotExists(seats[i], "1", "硬座(不一定有)");
            _appendIfNotExists(seats[i], "2", "软座(不一定有)");
            _appendIfNotExists(seats[i], "3", "硬卧(不一定有)");
            _appendIfNotExists(seats[i], "4", "软卧(不一定有)");
        }
    }
}

_completeSeats();
window.setInterval(_completeSeats, 2000);

// Show hidden date, and add label before it
var startDate = _showHiddenInput(document.getElementById("start_date"), "起始日期：");

