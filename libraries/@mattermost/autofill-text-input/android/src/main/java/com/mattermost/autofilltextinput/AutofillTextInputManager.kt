package com.mattermost.autofilltextinput

import android.content.Context
import android.os.Build
import android.util.Log
import android.view.ViewStructure
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.textinput.ReactTextInputManager
import java.net.URI
import java.net.URISyntaxException

class AutofillEditText(context: Context) : ReactEditText(context) {
    var webDomain: String? = null

    override fun onProvideAutofillStructure(structure: ViewStructure?, flags: Int) {
        super.onProvideAutofillStructure(structure, flags)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && webDomain != null && structure != null) {
            try {
                // Determine if webDomain is a full URL or just a domain
                val domainToCheck = webDomain!!
                val domain = if (domainToCheck.startsWith("http://") || domainToCheck.startsWith("https://")) {
                     URI(domainToCheck).host
                } else {
                     domainToCheck
                }
                
                structure.setWebDomain(domain)
            } catch (e: URISyntaxException) {
                Log.e("AutofillTextInput", "Invalid webDomain: $webDomain", e)
            } catch (e: Exception) {
                Log.e("AutofillTextInput", "Error setting webDomain", e)
            }
        }
    }
}

class AutofillTextInputManager : ReactTextInputManager() {
    override fun getName() = "AutofillTextInput"

    override fun createViewInstance(context: ThemedReactContext): ReactEditText {
        return AutofillEditText(context)
    }

    @ReactProp(name = "webDomain")
    fun setWebDomain(view: ReactEditText, webDomain: String?) {
        if (view is AutofillEditText) {
            view.webDomain = webDomain
        }
    }
}