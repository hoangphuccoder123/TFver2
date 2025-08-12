/**
 * CV Formatting Score Calculator
 * Đánh giá chất lượng trình bày và format của CV
 */

class FormattingScorer {
    constructor() {
        // Định nghĩa các tiêu chí đánh giá format
        this.criteria = {
            contactInfo: {
                weight: 1,
                maxScore: 100,
                description: "Thông tin liên hệ rõ ràng"
            },
            fontConsistency: {
                weight: 1,
                maxScore: 100,
                description: "Sử dụng font chữ nhất quán"
            },
            spelling: {
                weight: 2,
                maxScore: 100,
                description: "Không có lỗi chính tả"
            },
            visualBalance: {
                weight: 1,
                maxScore: 100,
                description: "Cân bằng màu sắc và bố cục"
            },
            structure: {
                weight: 1,
                maxScore: 100,
                description: "Cấu trúc CV rõ ràng"
            },
            length: {
                weight: 0.5,
                maxScore: 100,
                description: "Độ dài CV phù hợp"
            }
        };

        // Required sections cho CV
        this.requiredSections = [
            'contact', 'thông tin', 'liên hệ',
            'experience', 'kinh nghiệm', 'làm việc',
            'education', 'học vấn', 'trình độ',
            'skills', 'kỹ năng', 'năng lực'
        ];

        // Common spelling errors in Vietnamese
        this.commonErrors = [
            { wrong: 'hieeur', correct: 'hiểu' },
            { wrong: 'duowcj', correct: 'được' },
            { wrong: 'lamf', correct: 'làm' },
            { wrong: 'naêng', correct: 'năng' },
            { wrong: 'kinhr', correct: 'kinh' },
            { wrong: 'nghieemj', correct: 'nghiệm' },
            { wrong: 'tronh', correct: 'trong' },
            { wrong: 'chuyen', correct: 'chuyên' },
            { wrong: 'mon', correct: 'môn' },
            { wrong: 'hocj', correct: 'học' }
        ];

        // Contact info patterns
        this.contactPatterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /(?:\+84|0)(?:\d{8,10})/g,
            linkedin: /linkedin\.com\/in\/[\w-]+/gi,
            github: /github\.com\/[\w-]+/gi,
            address: /(?:địa chỉ|address)[\s:]*([^\n\r]+)/gi
        };
    }

    /**
     * Chuẩn hóa text để phân tích
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s\@\.\-\+]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Đánh giá thông tin liên hệ
     */
    evaluateContactInfo(cvText) {
        const normalizedText = this.normalizeText(cvText);
        let score = 0;
        const details = {
            hasEmail: false,
            hasPhone: false,
            hasAddress: false,
            hasSocialMedia: false,
            foundContacts: []
        };

        // Check email
        const emailMatches = cvText.match(this.contactPatterns.email);
        if (emailMatches && emailMatches.length > 0) {
            details.hasEmail = true;
            details.foundContacts.push({ type: 'email', value: emailMatches[0] });
            score += 25;
        }

        // Check phone
        const phoneMatches = cvText.match(this.contactPatterns.phone);
        if (phoneMatches && phoneMatches.length > 0) {
            details.hasPhone = true;
            details.foundContacts.push({ type: 'phone', value: phoneMatches[0] });
            score += 25;
        }

        // Check address
        const addressMatches = cvText.match(this.contactPatterns.address);
        if (addressMatches && addressMatches.length > 0) {
            details.hasAddress = true;
            details.foundContacts.push({ type: 'address', value: addressMatches[0] });
            score += 20;
        }

        // Check social media
        const linkedinMatches = cvText.match(this.contactPatterns.linkedin);
        const githubMatches = cvText.match(this.contactPatterns.github);
        if (linkedinMatches || githubMatches) {
            details.hasSocialMedia = true;
            if (linkedinMatches) details.foundContacts.push({ type: 'linkedin', value: linkedinMatches[0] });
            if (githubMatches) details.foundContacts.push({ type: 'github', value: githubMatches[0] });
            score += 30;
        }

        return {
            score: Math.min(score, 100),
            details: details
        };
    }

    /**
     * Đánh giá tính nhất quán của font chữ (dựa trên pattern text)
     */
    evaluateFontConsistency(cvText) {
        // Phân tích based on text patterns
        const lines = cvText.split('\n').filter(line => line.trim());
        let score = 80; // Default good score
        const issues = [];

        // Check for mixed case inconsistencies
        const inconsistentCasing = this.detectInconsistentCasing(lines);
        if (inconsistentCasing.length > 0) {
            score -= 20;
            issues.push(`Không nhất quán trong cách viết hoa: ${inconsistentCasing.slice(0, 3).join(', ')}`);
        }

        // Check for excessive formatting symbols
        const excessiveSymbols = this.detectExcessiveSymbols(cvText);
        if (excessiveSymbols) {
            score -= 15;
            issues.push("Sử dụng quá nhiều ký tự đặc biệt hoặc emoji");
        }

        // Check for mixed numbering styles
        const mixedNumbering = this.detectMixedNumbering(lines);
        if (mixedNumbering) {
            score -= 10;
            issues.push("Không nhất quán trong cách đánh số");
        }

        return {
            score: Math.max(score, 0),
            details: {
                issues: issues,
                caseConsistency: inconsistentCasing.length === 0,
                symbolUsage: !excessiveSymbols,
                numberingConsistency: !mixedNumbering
            }
        };
    }

    /**
     * Phát hiện case không nhất quán
     */
    detectInconsistentCasing(lines) {
        const inconsistencies = [];
        const headerPattern = /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
        
        for (let line of lines) {
            if (line.length > 5 && line.length < 50) {
                // Check for mixed case in headers
                if (headerPattern.test(line) && /[a-z]/.test(line) && /[A-Z]/.test(line)) {
                    const lowerCount = (line.match(/[a-z]/g) || []).length;
                    const upperCount = (line.match(/[A-Z]/g) || []).length;
                    if (lowerCount > 2 && upperCount > 2) {
                        inconsistencies.push(line);
                    }
                }
            }
        }
        
        return inconsistencies;
    }

    /**
     * Phát hiện sử dụng quá nhiều symbols
     */
    detectExcessiveSymbols(text) {
        const symbolCount = (text.match(/[★☆●○■□▪▫◆◇▲△▼▽]/g) || []).length;
        const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
        
        const textLength = text.length;
        const symbolRatio = (symbolCount + emojiCount) / textLength;
        
        return symbolRatio > 0.02; // More than 2% symbols/emojis
    }

    /**
     * Phát hiện numbering không nhất quán
     */
    detectMixedNumbering(lines) {
        const numberingStyles = {
            numeric: /^\d+\./,
            roman: /^[ivx]+\./i,
            alpha: /^[a-z]\./,
            bullet: /^[•·▪▫-]/
        };

        const foundStyles = new Set();
        
        for (let line of lines) {
            for (let [style, pattern] of Object.entries(numberingStyles)) {
                if (pattern.test(line.trim())) {
                    foundStyles.add(style);
                    break;
                }
            }
        }

        return foundStyles.size > 2; // Mixed if more than 2 styles
    }

    /**
     * Đánh giá lỗi chính tả
     */
    evaluateSpelling(cvText) {
        const normalizedText = this.normalizeText(cvText);
        let score = 100;
        const errors = [];

        // Check common errors
        for (let errorPattern of this.commonErrors) {
            const regex = new RegExp(errorPattern.wrong, 'gi');
            const matches = normalizedText.match(regex);
            if (matches) {
                errors.push({
                    error: errorPattern.wrong,
                    correct: errorPattern.correct,
                    count: matches.length
                });
                score -= matches.length * 5; // -5 points per error
            }
        }

        // Check for repeated words
        const repeatedWords = this.findRepeatedWords(normalizedText);
        if (repeatedWords.length > 0) {
            errors.push({
                type: 'repeated_words',
                words: repeatedWords
            });
            score -= repeatedWords.length * 3;
        }

        // Check for basic grammar patterns
        const grammarIssues = this.checkBasicGrammar(normalizedText);
        if (grammarIssues.length > 0) {
            errors.push({
                type: 'grammar',
                issues: grammarIssues
            });
            score -= grammarIssues.length * 2;
        }

        return {
            score: Math.max(score, 0),
            details: {
                totalErrors: errors.length,
                errors: errors,
                errorTypes: {
                    spelling: errors.filter(e => e.error).length,
                    repeated: repeatedWords.length,
                    grammar: grammarIssues.length
                }
            }
        };
    }

    /**
     * Tìm từ lặp lại
     */
    findRepeatedWords(text) {
        const words = text.split(/\s+/);
        const repeated = [];
        
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i] === words[i + 1] && words[i].length > 2) {
                repeated.push(words[i]);
            }
        }
        
        return [...new Set(repeated)];
    }

    /**
     * Kiểm tra ngữ pháp cơ bản
     */
    checkBasicGrammar(text) {
        const issues = [];
        
        // Check for space before punctuation
        if (/\s+[.,;!?]/.test(text)) {
            issues.push("Có khoảng trắng thừa trước dấu câu");
        }
        
        // Check for missing space after punctuation
        if (/[.,;!?][a-zA-Z]/.test(text)) {
            issues.push("Thiếu khoảng trắng sau dấu câu");
        }
        
        // Check for multiple spaces
        if (/\s{3,}/.test(text)) {
            issues.push("Có nhiều khoảng trắng liên tiếp");
        }
        
        return issues;
    }

    /**
     * Đánh giá cân bằng visual
     */
    evaluateVisualBalance(cvText) {
        let score = 70; // Default score
        const issues = [];
        
        // Analyze line lengths
        const lines = cvText.split('\n').filter(line => line.trim());
        const lineLengths = lines.map(line => line.length);
        const avgLength = lineLengths.reduce((sum, len) => sum + len, 0) / lineLengths.length;
        
        // Check for extremely long lines
        const longLines = lineLengths.filter(len => len > avgLength * 2).length;
        if (longLines > lines.length * 0.2) {
            score -= 15;
            issues.push("Có quá nhiều dòng dài, ảnh hưởng đến khả năng đọc");
        }
        
        // Check for very short lines (except headers)
        const shortLines = lineLengths.filter(len => len < 10 && len > 0).length;
        if (shortLines > lines.length * 0.3) {
            score -= 10;
            issues.push("Có quá nhiều dòng ngắn, làm CV trông rời rạc");
        }
        
        // Check for excessive capitalization
        const capsText = cvText.match(/[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g) || [];
        const totalChars = cvText.replace(/\s/g, '').length;
        const capsRatio = capsText.length / totalChars;
        
        if (capsRatio > 0.3) {
            score -= 20;
            issues.push("Sử dụng quá nhiều chữ hoa");
        }
        
        // Check for good section separation
        const sectionSeparation = this.analyzeSectionSeparation(lines);
        if (!sectionSeparation.wellSeparated) {
            score -= 10;
            issues.push("Các phần trong CV không được phân tách rõ ràng");
        }
        
        return {
            score: Math.max(score, 0),
            details: {
                issues: issues,
                lineAnalysis: {
                    avgLength: Math.round(avgLength),
                    longLines: longLines,
                    shortLines: shortLines
                },
                capsRatio: Math.round(capsRatio * 100),
                sectionSeparation: sectionSeparation
            }
        };
    }

    /**
     * Phân tích phân tách sections
     */
    analyzeSectionSeparation(lines) {
        let headerCount = 0;
        let blankLineCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect headers (short lines, often capitalized)
            if (line.length < 30 && line.length > 3) {
                const isHeader = /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(line);
                if (isHeader) headerCount++;
            }
            
            // Count blank lines
            if (line.trim() === '') blankLineCount++;
        }
        
        const wellSeparated = headerCount >= 3 && blankLineCount >= headerCount * 0.5;
        
        return {
            wellSeparated: wellSeparated,
            headerCount: headerCount,
            blankLineCount: blankLineCount
        };
    }

    /**
     * Đánh giá cấu trúc CV
     */
    evaluateStructure(cvText) {
        const normalizedText = this.normalizeText(cvText);
        let score = 0;
        const foundSections = [];
        const missingSections = [];
        
        // Check for required sections
        for (let section of this.requiredSections) {
            if (normalizedText.includes(section)) {
                foundSections.push(section);
                score += 25; // Each section worth 25 points
            } else {
                missingSections.push(section);
            }
        }
        
        // Bonus for logical order
        const orderBonus = this.checkSectionOrder(normalizedText);
        score += orderBonus;
        
        // Check for personal statement/objective
        const hasObjective = this.checkForObjective(normalizedText);
        if (hasObjective) {
            score += 10;
        }
        
        return {
            score: Math.min(score, 100),
            details: {
                foundSections: foundSections,
                missingSections: missingSections,
                sectionCount: foundSections.length,
                hasLogicalOrder: orderBonus > 0,
                hasObjective: hasObjective
            }
        };
    }

    /**
     * Kiểm tra thứ tự sections
     */
    checkSectionOrder(text) {
        const sectionOrder = [
            ['contact', 'thông tin', 'liên hệ'],
            ['objective', 'mục tiêu', 'giới thiệu'],
            ['experience', 'kinh nghiệm'],
            ['education', 'học vấn'],
            ['skills', 'kỹ năng']
        ];
        
        let lastIndex = -1;
        let orderScore = 0;
        
        for (let sectionGroup of sectionOrder) {
            for (let section of sectionGroup) {
                const index = text.indexOf(section);
                if (index !== -1) {
                    if (index > lastIndex) {
                        orderScore += 5;
                        lastIndex = index;
                    }
                    break;
                }
            }
        }
        
        return orderScore;
    }

    /**
     * Kiểm tra objective/personal statement
     */
    checkForObjective(text) {
        const objectiveKeywords = [
            'objective', 'mục tiêu', 'giới thiệu', 'tóm tắt',
            'profile', 'summary', 'about me', 'về tôi'
        ];
        
        return objectiveKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * Đánh giá độ dài CV
     */
    evaluateLength(cvText) {
        const wordCount = cvText.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = cvText.length;
        
        let score = 100;
        const details = {
            wordCount: wordCount,
            charCount: charCount,
            estimatedPages: Math.ceil(wordCount / 250) // Rough estimation
        };
        
        // Ideal length: 300-800 words for 1-2 pages
        if (wordCount < 200) {
            score = 50;
            details.feedback = "CV quá ngắn, cần bổ sung thêm thông tin";
        } else if (wordCount > 1000) {
            score = 60;
            details.feedback = "CV hơi dài, nên cô đọng hơn";
        } else if (wordCount >= 300 && wordCount <= 800) {
            score = 100;
            details.feedback = "Độ dài CV phù hợp";
        } else {
            score = 80;
            details.feedback = "Độ dài CV chấp nhận được";
        }
        
        return {
            score: score,
            details: details
        };
    }

    /**
     * Tính điểm formatting tổng thể
     */
    calculateFormattingScore(cvText) {
        const evaluations = {
            contactInfo: this.evaluateContactInfo(cvText),
            fontConsistency: this.evaluateFontConsistency(cvText),
            spelling: this.evaluateSpelling(cvText),
            visualBalance: this.evaluateVisualBalance(cvText),
            structure: this.evaluateStructure(cvText),
            length: this.evaluateLength(cvText)
        };
        
        // Calculate weighted score
        let totalWeightedScore = 0;
        let totalWeight = 0;
        
        for (let [criterion, result] of Object.entries(evaluations)) {
            const weight = this.criteria[criterion].weight;
            totalWeightedScore += result.score * weight;
            totalWeight += weight;
        }
        
        const finalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
        
        return {
            score: Math.round(finalScore),
            breakdown: evaluations,
            summary: this.generateFormattingSummary(evaluations)
        };
    }

    /**
     * Tạo summary của đánh giá formatting
     */
    generateFormattingSummary(evaluations) {
        const strengths = [];
        const weaknesses = [];
        const recommendations = [];
        
        for (let [criterion, result] of Object.entries(evaluations)) {
            const criterionName = this.criteria[criterion].description;
            
            if (result.score >= 80) {
                strengths.push(criterionName);
            } else if (result.score < 60) {
                weaknesses.push(criterionName);
                
                // Add specific recommendations
                if (criterion === 'contactInfo' && !result.details.hasEmail) {
                    recommendations.push("Bổ sung địa chỉ email");
                }
                if (criterion === 'spelling' && result.details.totalErrors > 0) {
                    recommendations.push("Kiểm tra và sửa lỗi chính tả");
                }
                if (criterion === 'structure' && result.details.missingSections.length > 0) {
                    recommendations.push(`Bổ sung sections: ${result.details.missingSections.slice(0, 2).join(', ')}`);
                }
            }
        }
        
        return {
            strengths: strengths,
            weaknesses: weaknesses,
            recommendations: recommendations,
            overallQuality: this.getOverallQuality(evaluations)
        };
    }

    /**
     * Đánh giá chất lượng tổng thể
     */
    getOverallQuality(evaluations) {
        const avgScore = Object.values(evaluations).reduce((sum, evaluation) => sum + evaluation.score, 0) / Object.keys(evaluations).length;
        
        if (avgScore >= 85) return "Xuất sắc";
        if (avgScore >= 70) return "Tốt";
        if (avgScore >= 55) return "Trung bình";
        return "Cần cải thiện";
    }

    /**
     * Phân tích formatting chi tiết
     */
    analyzeFormatting(cvText) {
        const result = this.calculateFormattingScore(cvText);
        
        return {
            ...result,
            detailedAnalysis: {
                readabilityScore: this.calculateReadabilityScore(cvText),
                professionalLevel: this.assessProfessionalLevel(result),
                improvementPriority: this.getImprovementPriority(result.breakdown)
            }
        };
    }

    /**
     * Tính điểm readability
     */
    calculateReadabilityScore(cvText) {
        const sentences = cvText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = cvText.split(/\s+/).filter(w => w.length > 0);
        const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
        
        // Simplified readability formula
        const avgWordsPerSentence = words.length / sentences.length;
        const avgSyllablesPerWord = syllables / words.length;
        
        // Lower score = easier to read (inverted for our scoring system)
        const readabilityIndex = (avgWordsPerSentence * 1.5) + (avgSyllablesPerWord * 100);
        const score = Math.max(0, 100 - readabilityIndex * 2);
        
        return {
            score: Math.round(score),
            avgWordsPerSentence: Math.round(avgWordsPerSentence),
            avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
        };
    }

    /**
     * Đếm syllables (simplified for Vietnamese)
     */
    countSyllables(word) {
        const vowels = 'aeiouàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ';
        let count = 0;
        let lastWasVowel = false;
        
        for (let char of word.toLowerCase()) {
            const isVowel = vowels.includes(char);
            if (isVowel && !lastWasVowel) {
                count++;
            }
            lastWasVowel = isVowel;
        }
        
        return Math.max(1, count);
    }

    /**
     * Đánh giá mức độ chuyên nghiệp
     */
    assessProfessionalLevel(result) {
        const score = result.score;
        
        if (score >= 90) return { level: "Rất chuyên nghiệp", description: "CV có format xuất sắc" };
        if (score >= 75) return { level: "Chuyên nghiệp", description: "CV có format tốt với một vài điểm cần cải thiện" };
        if (score >= 60) return { level: "Cơ bản", description: "CV có format chấp nhận được nhưng cần cải thiện" };
        return { level: "Cần cải thiện nhiều", description: "CV cần được format lại toàn bộ" };
    }

    /**
     * Xác định priority cải thiện
     */
    getImprovementPriority(breakdown) {
        const priorities = [];
        
        for (let [criterion, result] of Object.entries(breakdown)) {
            if (result.score < 60) {
                priorities.push({
                    criterion: criterion,
                    description: this.criteria[criterion].description,
                    score: result.score,
                    weight: this.criteria[criterion].weight,
                    priority: this.criteria[criterion].weight * (100 - result.score)
                });
            }
        }
        
        return priorities.sort((a, b) => b.priority - a.priority);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormattingScorer;
} else {
    window.FormattingScorer = FormattingScorer;
}
