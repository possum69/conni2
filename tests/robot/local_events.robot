*** Settings ***
Library           SeleniumLibrary
Suite Setup       Open Local App
Suite Teardown    Close All Browsers
Test Timeout      5 minutes

*** Variables ***
${BASE_URL}       http://127.0.0.1:8080/
${BROWSER}        edge
${ALPHA}          RF Contributor Alpha
${BETA}           RF Contributor Beta
${LOCATION}       RF Test Room
${RENAMED_LOCATION}    RF Test Room Updated
${SCHEDULED_TOPIC}    RF Scheduled Topic
${EARLIER_TOPIC}    RF Earlier Program Topic
${FILTER_TOPIC}   RF Z Filter Topic
${BOB_DELETE_TOPIC}    RF Bob Delete Topic
${ALPHA_DELETE_TOPIC}    RF Alpha Delete Topic
${CREATOR_EDIT_TOPIC}    RF Creator Edit Topic
${EARLIER_DATE}   2030-05-09
${FIRST_DATE}     2030-05-10
${SECOND_DATE}    2030-05-11

*** Test Cases ***
Local User Can Manage Events Locations Topics And Program Views
    Wait Until Element Is Visible    id=local-login-form    timeout=15 seconds
    Input Text    id=local-user-name    ${ALPHA}
    Click Element    css=#local-login-form button[type="submit"]
    Wait Until Element Is Visible    id=event-select-form    timeout=15 seconds
    Element Should Be Visible    id=github-user-name
    Element Should Contain    id=github-user-name    ${ALPHA}

    ${timestamp}=    Get Time    epoch
    ${event_name}=    Set Variable    RF Event ${timestamp}
    ${renamed_event}=    Set Variable    ${event_name} Updated
    Set Test Variable    ${EVENT_NAME}    ${renamed_event}
    Click Element    css=#event-setup-step > details:not(#event-manage-panel) > summary
    Input Text    id=new-event-name    ${event_name}
    Click Element    css=#event-create-form button[type="submit"]
    Wait Until Element Is Visible    id=event-manage-panel    timeout=15 seconds
    Input Text    id=managed-event-name    ${renamed_event}
    Click Element    css=#event-rename-form button[type="submit"]
    Wait Until Element Contains    id=event-manage-status    Event saved.    timeout=10 seconds
    Element Should Contain    id=event-select    ${renamed_event}
    Select From List By Label    id=event-select    ${renamed_event}
    Click Element    css=#event-select-form button[type="submit"]
    Wait Until Element Is Visible    id=active-event-label    timeout=15 seconds
    Element Should Contain    id=current-event-name    ${renamed_event}

    Click Element    css=button.tab[data-tab="locations"]
    Click Element    css=#locations-section details.topic-create summary
    Input Text    id=new-location-name    ${LOCATION}
    Input Text    id=new-location-capacity    12
    Input Text    id=new-location-description    Original room description
    Input Text    id=new-location-facilities    Projector, Whiteboard
    Click Element    css=#create-location-form button[type="submit"]
    Wait Until Element Contains    id=location-create-status    Location saved.    timeout=10 seconds
    Element Should Contain    id=locations-cards    ${LOCATION}
    Element Should Contain    id=locations-cards    Projector
    Click Element    xpath=//article[.//h3[normalize-space()="${LOCATION}"]]/details[contains(@class,"item-editor")]/summary
    Input Text    css=[id="location-${LOCATION}"] input[name="name"]    ${RENAMED_LOCATION}
    Input Text    css=[id="location-${LOCATION}"] input[name="capacity"]    20
    Input Text    css=[id="location-${LOCATION}"] textarea[name="description"]    Updated room description
    Input Text    css=[id="location-${LOCATION}"] input[name="facilities"]    Screen, Whiteboard
    Click Element    css=[id="location-${LOCATION}"] button.save-item
    Wait Until Element Is Visible    css=[id="location-${RENAMED_LOCATION}"]    timeout=10 seconds
    Element Should Contain    css=[id="location-${RENAMED_LOCATION}"]    Updated room description
    Element Should Contain    css=[id="location-${RENAMED_LOCATION}"]    Screen

    Switch Local User    ${BETA}
    Click Element    css=button.tab[data-tab="topics"]
    Create Topic With Contributors    ${BOB_DELETE_TOPIC}    Bob can edit and delete this shared topic.    English
    Create Topic With Contributors    ${SCHEDULED_TOPIC}    Original scheduling description.    English
    Create Topic With Contributors    ${FILTER_TOPIC}    Searchable Spanish topic description.    Spanish
    Click Element    css=[data-like-type="topics"][data-like-name="${FILTER_TOPIC}"]
    Wait Until Keyword Succeeds    10 seconds    200 milliseconds    Element Attribute Value Should Be    css=[data-like-type="topics"][data-like-name="${FILTER_TOPIC}"]    aria-pressed    true
    Create Topic With Contributors    ${EARLIER_TOPIC}    Earlier scheduled program item.    English

    Edit Topic Description    ${BOB_DELETE_TOPIC}    Bob edited this topic.
    Element Should Contain    xpath=//article[.//h3[normalize-space()="${BOB_DELETE_TOPIC}"]]    Bob edited this topic.
    Click Element    css=[data-delete-name="${BOB_DELETE_TOPIC}"]
    Handle Alert    ACCEPT
    Wait Until Page Does Not Contain Element    xpath=//article[.//h3[normalize-space()="${BOB_DELETE_TOPIC}"]]

    Edit Topic Description    ${SCHEDULED_TOPIC}    Edited before scheduling.
    Schedule Topic    ${SCHEDULED_TOPIC}    ${FIRST_DATE}    09:00    10:00
    Schedule Topic    ${EARLIER_TOPIC}    ${EARLIER_DATE}    08:00    09:00
    Click Element    css=button.tab[data-tab="program"]
    Wait Until Element Is Visible    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${SCHEDULED_TOPIC}"]]    timeout=10 seconds
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${SCHEDULED_TOPIC}"]]    09:00 - 10:00
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${SCHEDULED_TOPIC}"]]    May 10, 2030
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${EARLIER_TOPIC}"]]    08:00 - 09:00
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${EARLIER_TOPIC}"]]    May 9, 2030

    Click Element    css=button.tab[data-tab="topics"]
    Create Topic With Contributors    ${ALPHA_DELETE_TOPIC}    Alice can edit and delete this shared topic.    English
    Switch Local User    ${ALPHA}
    Click Element    css=button.tab[data-tab="topics"]
    Edit Topic Description    ${ALPHA_DELETE_TOPIC}    Alice edited this topic.
    Element Should Contain    xpath=//article[.//h3[normalize-space()="${ALPHA_DELETE_TOPIC}"]]    Alice edited this topic.
    Click Element    css=[data-delete-name="${ALPHA_DELETE_TOPIC}"]
    Handle Alert    ACCEPT
    Wait Until Page Does Not Contain Element    xpath=//article[.//h3[normalize-space()="${ALPHA_DELETE_TOPIC}"]]

    Click Element    css=button.tab[data-tab="program"]
    Edit Program Schedule    ${SCHEDULED_TOPIC}    ${SECOND_DATE}    11:00    12:00
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${SCHEDULED_TOPIC}"]]    11:00 - 12:00
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${SCHEDULED_TOPIC}"]]    May 11, 2030
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${SCHEDULED_TOPIC}"]]    ${RENAMED_LOCATION}

    Check Program Filters And Views    ${SCHEDULED_TOPIC}
    Check Topic Filters And Sort Options    ${SCHEDULED_TOPIC}    ${FILTER_TOPIC}

    Switch Local User    ${BETA}
    Click Element    css=button.tab[data-tab="topics"]
    Create Topic With Contributors    ${CREATOR_EDIT_TOPIC}    Created by Beta for creator-edit coverage.    English    ${BETA}
    Switch Local User    ${ALPHA}
    Click Element    css=button.tab[data-tab="topics"]
    Edit Topic Description    ${CREATOR_EDIT_TOPIC}    Edited by the event creator.
    Page Should Not Contain Element    css=[data-delete-name="${CREATOR_EDIT_TOPIC}"]

    Switch Local User    ${BETA}
    Click Element    css=button.tab[data-tab="topics"]
    Schedule Topic    ${CREATOR_EDIT_TOPIC}    ${FIRST_DATE}    13:00    14:00
    Switch Local User    ${ALPHA}
    Click Element    css=button.tab[data-tab="program"]
    Edit Program Schedule    ${CREATOR_EDIT_TOPIC}    ${SECOND_DATE}    15:00    16:00
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${CREATOR_EDIT_TOPIC}"]]    May 11, 2030

    Sign In And Leave Event Chooser Open
    Click Element    css=#event-manage-panel summary
    Click Element    id=delete-event-button
    Handle Alert    ACCEPT    
    Wait Until Keyword Succeeds    10 seconds    200 milliseconds    Element Should Be Disabled    id=event-select
    Element Should Contain    id=event-select    No events yet.
    
*** Keywords ***
Open Local App
    Open Browser    ${BASE_URL}    ${BROWSER}
    #    options=add_argument("--headless=new"); add_argument("--disable-gpu"); add_argument("--window-size=1440,1200")
    Set Selenium Speed    0.1 seconds
    Set Selenium Timeout    10 seconds

Switch Local User
    [Arguments]    ${name}
    Click Element    id=logout-button
    Wait Until Element Is Visible    id=local-login-form    timeout=15 seconds
    Input Text    id=local-user-name    ${name}
    Click Element    css=#local-login-form button[type="submit"]
    Wait Until Element Is Visible    id=event-select-form    timeout=15 seconds
    Select From List By Label    id=event-select    ${EVENT_NAME}
    Click Element    css=#event-select-form button[type="submit"]
    Wait Until Element Is Visible    id=active-event-label    timeout=15 seconds

Sign In And Leave Event Chooser Open
    Click Element    id=logout-button
    Wait Until Element Is Visible    id=local-login-form    timeout=15 seconds
    Input Text    id=local-user-name    ${ALPHA}
    Click Element    css=#local-login-form button[type="submit"]
    Wait Until Element Is Visible    id=event-select-form    timeout=15 seconds
    Select From List By Label    id=event-select    ${EVENT_NAME}
    Wait Until Element Is Visible    id=event-manage-panel    timeout=10 seconds

Create Topic With Contributors
    [Arguments]    ${name}    ${description}    ${language}    ${contributor}=${EMPTY}
    Click Element    css=#topics-section details.topic-create summary
    Input Text    id=new-topic-name    ${name}
    Input Text    id=new-topic-description    ${description}
    IF    $contributor == ''
        Select From List By Label    id=new-topic-contributors    ${ALPHA}    ${BETA}
    ELSE
        Select From List By Label    id=new-topic-contributors    ${contributor}
    END
    Input Text    id=new-topic-languages    ${language}
    Click Element    css=#create-topic-form button[type="submit"]
    Wait Until Element Contains    id=topic-create-status    Topic created.    timeout=10 seconds
    Wait Until Page Contains Element    xpath=//article[.//h3[normalize-space()="${name}"]]    timeout=10 seconds
    IF    $contributor == ''
        Element Should Contain    xpath=//article[.//h3[normalize-space()="${name}"]]    ${ALPHA}
        Element Should Contain    xpath=//article[.//h3[normalize-space()="${name}"]]    ${BETA}
    ELSE
        Element Should Contain    xpath=//article[.//h3[normalize-space()="${name}"]]    ${contributor}
    END

Edit Topic Description
    [Arguments]    ${name}    ${description}
    Click Element    xpath=//article[.//h3[normalize-space()="${name}"]]/details[contains(@class,"item-editor")]/summary
    Input Text    xpath=//form[@data-edit-name="${name}"]//textarea[@name="description"]    ${description}
    Click Element    xpath=//form[@data-edit-name="${name}"]//button[contains(@class,"save-item")]
    Wait Until Element Contains    xpath=//article[.//h3[normalize-space()="${name}"]]    ${description}    timeout=10 seconds

Schedule Topic
    [Arguments]    ${name}    ${date}    ${start}    ${end}
    Click Element    xpath=//article[.//h3[normalize-space()="${name}"]]/details[contains(@class,"item-editor")]/summary
    Click Element    xpath=//form[@data-edit-name="${name}"]//input[@name="moveToProgram"]
    Wait Until Element Is Visible    xpath=//form[@data-edit-name="${name}"]//div[contains(@class,"item-editor-schedule")]
    Select From List By Value    xpath=//form[@data-edit-name="${name}"]//select[@name="location"]    ${RENAMED_LOCATION}
    Set Date Field    form[data-edit-name="${name}"] input[name="date"]    ${date}
    Input Text    xpath=//form[@data-edit-name="${name}"]//input[@name="start"]    ${start}
    Input Text    xpath=//form[@data-edit-name="${name}"]//input[@name="end"]    ${end}
    Click Element    xpath=//form[@data-edit-name="${name}"]//button[contains(@class,"save-item")]

Edit Program Schedule
    [Arguments]    ${name}    ${date}    ${start}    ${end}
    Click Element    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${name}"]]/details[contains(@class,"item-editor")]/summary
    Set Date Field    form[data-edit-name="${name}"] input[name="date"]    ${date}
    Input Text    xpath=//form[@data-edit-name="${name}"]//input[@name="start"]    ${start}
    Input Text    xpath=//form[@data-edit-name="${name}"]//input[@name="end"]    ${end}
    Click Element    xpath=//form[@data-edit-name="${name}"]//button[contains(@class,"save-item")]
    Wait Until Element Contains    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${name}"]]    ${start} - ${end}    timeout=10 seconds

Set Date Field
    [Arguments]    ${locator}    ${date}
    ${actual_date}=    Execute Javascript    const field = document.querySelector('${locator}'); field.value = '${date}'; field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); return field.value;
    Should Be Equal As Strings    ${actual_date}    ${date}

Check Program Filters And Views
    [Arguments]    ${name}
    Click Element    css=button.tab[data-tab="program"]
    Select From List By Value    id=program-view-filter    list
    Wait Until Page Contains Element    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${name}"]]
    Select From List By Value    id=program-detail-filter    compact
    Element Should Not Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${name}"]]    Edited before scheduling.
    Select From List By Value    id=program-detail-filter    full
    Element Should Contain    xpath=//article[contains(@class,"card")][.//h3[normalize-space()="${name}"]]    Edited before scheduling.

    Select From List By Value    id=program-language-filter    English
    Element Should Contain    id=program-item-count    2
    Select From List By Value    id=program-language-filter    Spanish
    Element Should Contain    id=program-item-count    0
    Select From List By Value    id=program-language-filter    all
    Click Element    css=[data-like-type="program"][data-like-name="${name}"]
    Wait Until Keyword Succeeds    10 seconds    200 milliseconds    Element Attribute Value Should Be    css=[data-like-type="program"][data-like-name="${name}"]    aria-pressed    true
    Select From List By Value    id=program-liked-filter    my-likes
    Element Should Contain    id=program-item-count    1
    Select From List By Value    id=program-liked-filter    my-contribution
    Element Should Contain    id=program-item-count    2
    Select From List By Value    id=program-liked-filter    my-likes-and-contribution
    Element Should Contain    id=program-item-count    2
    Select From List By Value    id=program-liked-filter    all

    Input Text    id=program-search-filter    ${name}
    Element Should Contain    id=program-item-count    1
    Input Text    id=program-search-filter    Edited before scheduling
    Element Should Contain    id=program-item-count    1
    Input Text    id=program-search-filter    ${ALPHA}
    Element Should Contain    id=program-item-count    2
    Input Text    id=program-search-filter    no-such-program-item
    Element Should Contain    id=program-item-count    0
    Clear Element Text    id=program-search-filter
    Select From List By Value    id=program-view-filter    calendar
    Wait Until Page Contains Element    css=#program-cards .program-calendar
    Page Should Contain Element    css=#program-cards article.calendar-event
    ${calendar_days}=    Get Element Count    css=#program-cards .calendar-day
    Should Be Equal As Integers    ${calendar_days}    2
    Element Should Contain    id=program-cards    ${name}
    Element Should Contain    id=program-cards    ${EARLIER_TOPIC}
    Select From List By Value    id=program-view-filter    list
    Wait Until Page Contains Element    css=#program-cards article.card

Check Topic Filters And Sort Options
    [Arguments]    ${program_name}    ${topic_name}
    Click Element    css=button.tab[data-tab="topics"]
    Page Should Contain Element    css=#topics-cards article.card
    Click Element    css=[data-like-type="topics"][data-like-name="${topic_name}"]
    Wait Until Keyword Succeeds    10 seconds    200 milliseconds    Element Attribute Value Should Be    css=[data-like-type="topics"][data-like-name="${topic_name}"]    aria-pressed    true

    Element Should Contain    id=topics-item-count    3
    Select From List By Value    id=topics-type-filter    topics-only
    Element Should Contain    id=topics-item-count    1
    Element Should Not Contain    id=topics-cards    ${program_name}
    Element Should Contain    id=topics-cards    ${topic_name}
    Select From List By Value    id=topics-type-filter    all
    Element Should Contain    id=topics-item-count    3
    Element Should Contain    id=topics-cards    ${program_name}
    Select From List By Value    id=topics-language-filter    Spanish
    Element Should Contain    id=topics-item-count    1
    Element Should Contain    id=topics-cards    ${topic_name}
    Element Should Not Contain    id=topics-cards    ${program_name}
    Select From List By Value    id=topics-language-filter    English
    Element Should Contain    id=topics-item-count    2
    Select From List By Value    id=topics-language-filter    all

    Select From List By Value    id=topics-liked-filter    my-likes
    Element Should Contain    id=topics-cards    ${topic_name}
    Element Should Contain    id=topics-item-count    2
    Select From List By Value    id=topics-liked-filter    my-contribution
    Element Should Contain    id=topics-cards    ${topic_name}
    Element Should Contain    id=topics-item-count    3
    Select From List By Value    id=topics-liked-filter    my-likes-and-contribution
    Element Should Contain    id=topics-cards    ${topic_name}
    Element Should Contain    id=topics-item-count    3
    Select From List By Value    id=topics-liked-filter    all

    Select From List By Value    id=topics-sort-select    date
    ${sorted_names}=    Execute Javascript    return Array.from(document.querySelectorAll('#topics-cards > article > h3')).map(item => item.textContent.trim());
    Should Be Equal As Strings    ${sorted_names[0]}    ${EARLIER_TOPIC}
    Should Be Equal As Strings    ${sorted_names[1]}    ${program_name}
    Select From List By Value    id=topics-sort-select    likes
    ${sorted_names}=    Execute Javascript    return Array.from(document.querySelectorAll('#topics-cards > article > h3')).map(item => item.textContent.trim());
    Should Be Equal As Strings    ${sorted_names[0]}    ${topic_name}
    Should Be Equal As Strings    ${sorted_names[1]}    ${program_name}
    Select From List By Value    id=topics-sort-select    name
    ${sorted_names}=    Execute Javascript    return Array.from(document.querySelectorAll('#topics-cards > article > h3')).map(item => item.textContent.trim());
    Should Be Equal As Strings    ${sorted_names[0]}    ${EARLIER_TOPIC}
    Should Be Equal As Strings    ${sorted_names[1]}    ${program_name}
    Should Be Equal As Strings    ${sorted_names[2]}    ${topic_name}
    Select From List By Value    id=topics-detail-filter    compact
    Element Should Not Contain    id=topics-cards    Searchable Spanish topic description.
    Select From List By Value    id=topics-detail-filter    full
    Element Should Contain    id=topics-cards    Searchable Spanish topic description.

    Input Text    id=topics-search-filter    Searchable Spanish topic description
    Element Should Contain    id=topics-cards    ${topic_name}
    Input Text    id=topics-search-filter    ${topic_name}
    Element Should Contain    id=topics-cards    ${topic_name}
    Element Should Not Contain    id=topics-cards    ${program_name}
    Input Text    id=topics-search-filter    no-such-topic
    Element Should Contain    id=topics-cards    No program items or topics match these filters.
    Clear Element Text    id=topics-search-filter
