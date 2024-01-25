class EVN {

    static __formatString = (string, format = 'xx xx xxxx xxx - x', dividers = [' '], maxlength = 0) => {
        const type = typeof string
        if (type != 'number' && type != 'string') return string
        let str = type == 'string' ? string : String(string)
        str = str.replace(' ', '')
        if (dividers.length > 0) {
            const regex = new RegExp(dividers.join(''), 'g')
            str = str.replace(regex, '')
        }
        if (maxlength > 0) str = str.substr(0, maxlength)
        let string_formated = ''
        let i_format = 0
        let i_str = 0

        while (i_format < format.length && i_str < str.length) {
            const letter_format = format.substr(i_format, 1)
            if (letter_format == 'x') {
                string_formated += str.substr(i_str, 1)
                i_format++
                i_str++
            }
            else {
                string_formated += letter_format
                i_format++
            }
        }

        return string_formated
    }

    // Format EVN
    static formatEVN = (evn) => {
        return EVN.__formatString(evn, 'xx xx xxxx xxx - x', ['[^0-9]'], 12)
    }

    // Convert EVN-String to normal String
    static unformatEVN = (evn) => {
        return evn.replace(/[^0-9]/g, '')
    }

    // Check if evn belongs to tractionUnit
    // T.U. if first digit of EVN is 9
    static isTractionUnit = evn => {
        return parseInt(evn[0]) === 9
    }

    // Validate EVN
    static isValid = (evn) => {
        if (!evn) return false
        const unformatted = EVN.unformatEVN(evn)
        if (unformatted.length !== 12) return false
        return EVN.__checkControlNumber(unformatted)
    }

    // Check the Control Number
    static __checkControlNumber = (evn) => {
        let controlNumber = evn.substring(11)
        let incompleteEVN = evn.substring(0, 11)

        // modified Luhn-Algorithm, that calculates control Number
        var sum = 0
        for (var i = 10; i >= 0; i--) {
            var d = parseInt(incompleteEVN.charAt(i))
            if (i % 2 === 0) d *= 2
            else d *= 1
            if (d > 9) d = EVN.__calculateQuerSum(d)
            sum += d
        }
        let calculatedControlNumber = (10 - (sum % 10)) % 10

        return calculatedControlNumber === parseInt(controlNumber)
    }

    static __calculateQuerSum = (number) => {
        var tmp = number.toString().split('')
        var quer = 0
        for (var i = 0; i < tmp.length; i++) {
            quer += Number(tmp[i])
        }
        return quer
    }
}
export default EVN
